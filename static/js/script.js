document.addEventListener('DOMContentLoaded', function() {
    fetch('/data')
        .then(response => response.json())
        .then(data => {
            var nodes = new vis.DataSet(data.nodes);
            var edges = new vis.DataSet(data.edges);

            var container = document.getElementById('mynetwork');
            var networkData = { nodes: nodes, edges: edges };

            // --- 1. DYNAMIC COLOR ALLOCATION ---
            // A list of distinct colors that look good on dark backgrounds
            const safePalette = [
                '#FF6B6B', // Soft Red
                '#4ECDC4', // Teal
                '#FFE66D', // Yellow
                '#FF9F1C', // Orange
                '#9D4EDD', // Purple
                '#F72585', // Pink
                '#3A86FF', // Blue
                '#2EC4B6', // Green
                '#CBF3F0', // Mint
                '#FFFFFF'  // White (Last resort)
            ];

            const groupColorMap = {};
            const groupOptions = {};
            
            // Get unique groups from the data
            const uniqueGroups = [...new Set(data.nodes.map(item => item.group))].sort();

            // Assign a color to each group found in the database
            uniqueGroups.forEach((group, index) => {
                // Cycle through the palette using modulo (%) so we never run out of colors
                const color = safePalette[index % safePalette.length];
                
                // Store for the Legend
                groupColorMap[group] = color;

                // Store for Vis.js Options
                groupOptions[group] = { 
                    color: { background: color, border: color }, 
                    borderWidth: 0 
                };
            });

            // --- 2. POPULATE SEARCH ---
            const dataList = document.getElementById('paper-list');
            data.nodes.forEach(node => {
                let option = document.createElement('option');
                option.value = node.label; 
                dataList.appendChild(option);
            });

            // --- 3. GENERATE LEGEND ---
            const legendContainer = document.getElementById('legend');
            let legendHTML = '<div class="legend-title">Groups</div>';

            uniqueGroups.forEach(group => {
                legendHTML += `
                    <div class="legend-item">
                        <span class="legend-color-dot" style="background-color: ${groupColorMap[group]};"></span>
                        ${group}
                    </div>
                `;
            });
            legendContainer.innerHTML = legendHTML;

            // --- 4. GRAPH OPTIONS ---
            var options = {
                nodes: {
                    shape: 'dot',
                    borderWidth: 0, 
                    shadow: false,
                    font: {
                        color: '#ffffff', 
                        size: 16,
                        face: 'arial',
                        strokeWidth: 0, 
                        align: 'center'
                    },
                    scaling: {
                        min: 10,
                        max: 30,
                        label: { enabled: true, min: 14, max: 24 }
                    },
                    // Default color only used if a group is somehow missing
                    color: {
                        background: '#888888', 
                        highlight: { background: '#ffffff', border: '#ffffff' }
                    }
                },
                edges: {
                    width: 2,
                    color: { color: '#999555', highlight: '#aaaaaa', opacity: 0.6 },
                    shadow: false,
                    smooth: { type: 'continuous' }
                },
                physics: {
                    barnesHut: {
                        gravitationalConstant: -3000, 
                        springLength: 120,
                        springConstant: 0.05,
                        damping: 0.09
                    },
                    stabilization: { iterations: 150 }
                },
                // INJECT THE DYNAMIC GROUPS HERE
                groups: groupOptions, 
                interaction: {
                    hover: true,
                    tooltipDelay: 200,
                    hideEdgesOnDrag: true
                }
            };

            var network = new vis.Network(container, networkData, options);

            // --- SEARCH EVENTS ---
            const searchInput = document.getElementById('search-input');
            
            searchInput.addEventListener('change', function() {
                const val = this.value;
                const foundNode = data.nodes.find(n => n.label === val);

                if (foundNode) {
                    network.focus(foundNode.id, {
                        scale: 1.2, 
                        animation: {
                            duration: 1000, 
                            easingFunction: 'easeInOutQuad'
                        }
                    });
                    network.selectNodes([foundNode.id]);
                }
            });

            // --- RESET EVENTS ---
            document.getElementById('reset-btn').addEventListener('click', function() {
                network.fit({
                    animation: {
                        duration: 1000,
                        easingFunction: 'easeInOutQuad'
                    }
                });
                searchInput.value = ''; 
            });
        });
});