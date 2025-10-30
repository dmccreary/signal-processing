function drawGraph() {
    // Fetch the graph data from the JSON file
    fetch('signal-processing-concepts.json')
      .then(response => response.json())
      .then(data => {
        // Extract nodes from the JSON data
        const nodes = new vis.DataSet(data.nodes);

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
        improvedLayout: false, // must use false if any pinned nodes
      },
      edges: {
          arrows: {
            to: {
              enabled: true, // all edges have an arrow on the "to"" side
              type: 'arrow' // Options: 'arrow', 'bar', 'circle', 'triangle'
            }
          },
          smooth: {
            type: 'continuous' // Smooth edges
          }
        },
      nodes: {
        shape: 'dot',
        size: 20,
        font: {
          size: 20,
          color: 'black'
        },
        borderWidth: .5,
        borderWidthSelected: 4
      },
      groups: {
        "MATH": {
           color:{background:'#ff6b6b'}
        },
        "SIG": {
           color:{background:'#4ecdc4'},
        },
        "SYS": {
           color:{background:'#45b7d1'},
        },
        "SAMP": {
           color:{background:'#96ceb4'},
        },
        "FOUR": {
           color:{background:'#ffeaa7'},
        },
        "TRANS": {
           color:{background:'#dfe6e9'},
        },
        "FILT": {
           color:{background:'#a29bfe'},
        },
        "FDES": {
           color:{background:'#fd79a8'},
        },
        "ADV": {
           color:{background:'#fdcb6e'},
        },
        "APP": {
           color:{background:'#00b894'}
        },
        "AI": {
           color:{background:'#6c5ce7'}
        },
        "MISC": {
           color:{background:'#b2bec3'},
        }
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
          if (node.group === "MATH") {
              updatedNodes.push({
                id: node.id,
                x: -1200,
                group: node.group,
                fixed: { x: true, y: false }
              });
          } else if (node.group === "APP" || node.group === "AI") {
              updatedNodes.push({
                  id: node.id,
                  group: node.group,
                  x: 1200,
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

function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  const mainContent = document.getElementById("main");
  const toggleButton = document.getElementById("toggle-button");

  if (sidebar.style.display === "none") {
    sidebar.style.display = "block";
    // toggleButton.textContent = "☰"; // Open icon
    toggleButton.innerHTML = "&#9776;"; // Hamburger menu icon (open state)

    mainContent.style.marginLeft = "auto"; // Restore margin
  } else {
    sidebar.style.display = "none";
    // toggleButton.textContent = "→"; // Collapse sidebar icon
    toggleButton.innerHTML = "&#8594;"; // Right arrow (collapsed state)
    mainContent.style.marginLeft = "0"; // Remove margin for full width
  }
}