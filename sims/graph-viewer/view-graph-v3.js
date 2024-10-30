async function drawGraph() {
    // Fetch the graph data from the JSON file
    fetch('graph-data.json')
        .then(response => response.json())
        .then(data => {

            // Extract nodes and edges from the JSON data
            const nodes = new vis.DataSet(data.nodes);
            
            // Function to fix the x positions for groups 1 and 12 after the data is loaded
            nodes.forEach(function (node) {
                if (node.group === "found") {
                    node.x = -2000;
                    node.fixed = { x: true, y: false }; // Fix x, but let y be adjusted by physics
                } else if (node.group === "goal") {
                    node.x = 2000;
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
                    solver: 'forceAtlas2Based',
                    stabilization: false, // Disable stabilization to respect initial positions
                    forceAtlas2Based: {
                        springLength: 80          // Higher value for larger spacing
                    }
                },
                groups: {
                    found: {
                       shape: "box", 
                       color:{background:'red'},
                       font: {color: "white"},
                       fixed: {x: true, y: false}
                    },
                    2: {
                       color:{background:'orange'}, 
                    },
                    3: {
                        color:{background:'yellow'}, 
                     },
                    4: {
                        color:{background:'lightgreen'}, 
                     },
                    5: {
                        color:{background:'lightblue'}, 
                     },
                    6: {
                        color:{background:'plum'}, 
                     },
                    7: {
                        color:{background:'violet'}, 
                     },
                    8: {
                        color:{background:'silver'}, 
                     },
                    9: {
                        color:{background:'tan'}, 
                    },
                    goal: {
                       shape: "star", 
                       color:{background:'mediumaquamarine'}, 
                       font: { size: 16 }
                    }
            }
            };

            // Initialize the network
            const network = new vis.Network(container, graphData, options);
        })
        .catch(error => {
            console.error("Error loading or parsing graph-data.json:", error);
        });
}

// function to hide and unhide the sidebar with the legend
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
        // toggleButton.textContent = "→"; // Collapse icon
        toggleButton.innerHTML = "&#8594;"; // Right arrow (collapsed state)
        mainContent.style.marginLeft = "0"; // Remove margin for full width
    }
}

