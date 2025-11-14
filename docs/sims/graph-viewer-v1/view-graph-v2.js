function drawGraph() {
    // Fetch the graph data from the JSON file
    fetch('graph-data.json')
        .then(response => response.json())
        .then(data => {
            // Extract nodes from the JSON data
      const nodes = new vis.DataSet(data.nodes);

      // Function to fix the x positions for foundation and goal groups after JSON load
      nodes.forEach(function (node) {
          if (node.group === "found") {
              node.x = -900;
              node.fixed = { x: true, y: false }; // Fix x, but let y be adjusted by physics
              node.shape = "box";
              node.color = "red";
              node.font = {"color": "white"};
          } else if (node.group === "goal") {
              node.x = 900;
              node.fixed = { x: true, y: false }; // Fix x, but let y be adjusted by physics
              node.shape = "star";
              node.color = "gold";
          }
        });

            
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

            // Wait for the stabilization to finish
            network.once('stabilizationIterationsDone', function () {
                // Disable physics to prevent further movement
                network.setOptions({ physics: { enabled: false } });
  
                // Fix the x positions of the specified nodes
                const updatedNodes = [];
                nodes.forEach(function (node) {
                  if (node.group === "found") {
                      updatedNodes.push({
                        id: node.id,
                        x: -900,
                        group: node.group,
                        fixed: { x: true, y: false }
                      });
                  } else if (node.group === "goal") {
                      updatedNodes.push({
                          id: node.id,
                          group: node.group,
                          shape: "star",
                          x: 900,
                          fixed: { x: true, y: false }
                      });
                  }
                });
                nodes.update(updatedNodes);
              });
        })
        .catch(error => {
            console.error("Error loading or parsing graph-data.json:", error);
        });
}
