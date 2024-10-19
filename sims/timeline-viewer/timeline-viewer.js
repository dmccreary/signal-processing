// Load the events from the events.json file
fetch('events.json')
  .then(response => response.json())
  .then(data => {
    // Create a DataSet with the events
    var items = new vis.DataSet(data.items);

    // Configuration for the Timeline
    var options = {
      start: '1980',  // Set the initial visible start date
      end: '2000',    // Set the initial visible end date
      min: '1800',    // Set the minimum visible date
      max: '2030',    // Set the maximum visible date
      zoomMin: 31536000000,  // Minimum zoom level (e.g., 1 year in milliseconds)
      zoomMax: 1261440000000, // 40 years
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

    // Ensure that users cannot zoom in past a certain level (e.g., months)
    timeline.on('rangechange', function (event) {
      var range = timeline.getWindow();
      var interval = range.end - range.start;

      // Lock the zoom level to years or more (no zooming into months)
      if (interval < 31536000000) {  // 1 year in milliseconds
        timeline.setWindow(range.start, new Date(range.start.getFullYear() + 1, 0, 1));
      }
    });
  })
  .catch(error => console.error('Error loading events:', error));
