function drawGraph() {
  // Fetch the graph data from the JSON file
  fetch('graph-data.json')
    .then(response => response.json())
    .then(data => {
        // Extract nodes and edges from the JSON data
        const nodes = new vis.DataSet(data.nodes);

        // Function to fix the x positions for groups 1 and 12 after the data is loaded
        nodes.forEach(function (node) {
          if (node.group === "found") {
              node.x = -1000;
              node.fixed = { x: true, y: false }; // Fix x, but let y be adjusted by physics
          } else if (node.group === "goal") {
              node.x = 1000;
              node.fixed = { x: true, y: false }; // Fix x, but let y be adjusted by physics
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
      // Configuration options
  var options = {
    physics: {
      enabled: true,
      solver: 'forceAtlas2Based',
      stabilization: {
        iterations: 1000,
        updateInterval: 25
      },
    },
    layout: {
      improvedLayout: false, // Prevent node overlap
    },
    interaction: { 
      dragNodes: true // Allow dragging of nodes
    },
    edges: {
        arrows: {
          to: {
            enabled: true, // all edges have an arrow on the true side
            type: 'arrow', // Options: 'arrow', 'bar', 'circle', 'triangle'
            scaleFactor: 1
          }
        },
        smooth: {
          type: 'continuous' // Smooth edges
        }
      },
    // Optional: Define how nodes behave when fixed
    nodes: {
      shape: 'dot',
      size: 20,
      font: {
        size: 14,
        color: 'black'
      },
      borderWidth: 2,
      borderWidthSelected: 4
    }
};

          // Initialize the network
          const network = new vis.Network(container, graphData, options);
      })
      .catch(error => {
          console.error("Error loading or parsing graph-data.json:", error);
      });
}
