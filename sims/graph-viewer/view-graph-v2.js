function drawGraph() {
    // Fetch the graph data from the JSON file
    fetch('graph-data.json')
        .then(response => response.json())
        .then(data => {
            // Extract nodes and edges from the JSON data
            const nodes = new vis.DataSet(data.nodes.map(node => {
                // Pin foundational concepts on the left side
                if (node.group === 1) {  // Assuming group 1 is foundational
                    node.x = -300;
                    node.fixed = { x: true, y: false };
                } 
                // Pin advanced concepts on the right side
                else if (node.group === 10) {  // Assuming group 2 is advanced
                    node.x = 300;
                    node.fixed = { x: true, y: false };
                }
                // Enable physics for all other node properties
                node.physics = false;
                
                return node;
            }));
            
            const edges = new vis.DataSet(data.edges);

            // Create a network
            const container = document.getElementById('mynetwork');
            const graphData = {
                nodes: nodes,
                edges: edges
            };

            // Network options
            const options = {
                nodes: {
                    shape: 'dot',
                    size: 15,
                    font: {
                        size: 12
                    }
                },
                edges: {
                    arrows: 'to',
                    smooth: true
                },
                interaction: {
                    hover: true,
                    dragNodes: true,  // Disable dragging for pinned nodes
                    zoomView: true     // Allow zooming
                },
                physics: {
                    enabled: true
                }
            };

            // Initialize the network
            const network = new vis.Network(container, graphData, options);
        })
        .catch(error => {
            console.error("Error loading or parsing graph-data.json:", error);
        });
}
