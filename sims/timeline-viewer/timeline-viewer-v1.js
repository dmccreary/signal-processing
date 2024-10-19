// Load the events from the events.json file
fetch('events.json')
  .then(response => response.json())
  .then(data => {
    // Create a DataSet with the events
    var items = new vis.DataSet(data.items);

    // Configuration for the Timeline
    var optionsV1 = {
      start: '1800',
      end: '2030',
      editable: false,
      margin: {
        item: 20,
        axis: 40
      }
    };

    var optionsV2 = {
        start: '1800',
        end: '2030',
        min: '1800',  // Set the minimum visible date
        max: '2030',  // Set the maximum visible date
        zoomMin: 31536000000,  // Minimum zoom level (e.g., 1 year in milliseconds)
        zoomMax: 315360000000, // Maximum zoom level (e.g., 10 years in milliseconds)
        editable: false,
        margin: {
          item: 20,
          axis: 40
        }
    };

    var options = {
        start: '1960',  // Set the initial visible start date
        end: '2000',    // Set the initial visible end date
        min: '1800',    // Set the minimum visible date
        max: '2030',    // Set the maximum visible date
        zoomMin: 31536000000,  // Minimum zoom level (e.g., 1 year in milliseconds)
        zoomMax: 315360000000, // Maximum zoom level (e.g., 10 years in milliseconds)
        moveable: true,  // Disable user panning
        zoomable: true,   // Allow zooming but within bounds defined
        editable: false,  // Disable editing
  
        // Configure axis scaling to achieve approximately 1/4 inch per year
        timeAxis: { scale: 'year', step: 1 },  // Ensure the axis shows year labels only
        width: '100%',
        margin: {
          item: 20,
          axis: 40
        }
      };

    // Create a Timeline and link it to the DOM element with id 'timeline'
    var timeline = new vis.Timeline(document.getElementById('timeline'), items, options);
  })
  .catch(error => console.error('Error loading events:', error));
