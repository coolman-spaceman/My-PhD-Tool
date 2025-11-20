from flask import Flask, render_template, request, redirect, url_for, jsonify
from flask_sqlalchemy import SQLAlchemy
import os

app = Flask(__name__)

# Database Configuration
basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'network.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# Association table for linking papers (Self-Referencing Many-to-Many)
paper_links = db.Table('paper_links',
    db.Column('from_paper_id', db.Integer, db.ForeignKey('paper.id'), primary_key=True),
    db.Column('to_paper_id', db.Integer, db.ForeignKey('paper.id'), primary_key=True)
)

class Paper(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    group_name = db.Column(db.String(50), nullable=False)
    citations = db.Column(db.Integer, default=0)
    author = db.Column(db.String(100))
    
    # Relationship to access connected papers
    links = db.relationship('Paper', 
                            secondary=paper_links,
                            primaryjoin=id==paper_links.c.from_paper_id,
                            secondaryjoin=id==paper_links.c.to_paper_id,
                            backref='linked_by')

    def to_dict(self):
        """Helper to convert object to dictionary for JSON response"""
        return {
            'id': self.id,
            'label': self.name,
            'group': self.group_name,
            'value': self.citations, # Vis.js uses 'value' to determine node size
            'title': f"Author: {self.author} <br> Citations: {self.citations}" # Tooltip
        }

# Create the database tables
with app.app_context():
    db.create_all()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/data')
def get_data():
    """API endpoint to fetch graph data for the frontend"""
    papers = Paper.query.all()
    
    nodes = [p.to_dict() for p in papers]
    edges = []
    
    for p in papers:
        for linked_paper in p.links:
            # Vis.js edge format
            edges.append({'from': p.id, 'to': linked_paper.id})

    return jsonify({'nodes': nodes, 'edges': edges})

@app.route('/add', methods=['GET', 'POST'])
def add_node():
    if request.method == 'POST':
        name = request.form['name']
        group = request.form['group']
        citations = int(request.form['citations'])
        author = request.form['author']
        
        # Create new paper
        new_paper = Paper(name=name, group_name=group, citations=citations, author=author)
        
        # Handle Links (User enters comma-separated IDs, e.g., "1, 3, 5")
        link_ids_raw = request.form.get('links', '')
        if link_ids_raw:
            try:
                # Convert string "1,2" to list of integers [1,2]
                link_ids = [int(x.strip()) for x in link_ids_raw.split(',') if x.strip()]
                for link_id in link_ids:
                    paper_to_link = Paper.query.get(link_id)
                    if paper_to_link:
                        new_paper.links.append(paper_to_link)
            except ValueError:
                pass # Ignore invalid IDs for now

        db.session.add(new_paper)
        db.session.commit()
        return redirect(url_for('index'))
        
    # Pass existing papers so user knows IDs
    existing_papers = Paper.query.all()
    return render_template('add_node.html', papers=existing_papers)

if __name__ == '__main__':
    app.run(debug=True)
