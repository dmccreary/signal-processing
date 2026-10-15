// Signal Processing Milestones Timeline MicroSim (vis-timeline 7.7.3)
// CANVAS_HEIGHT: 750

// vis-timeline 7 reads a bare "1980" string as milliseconds since 1970 (the legacy
// vis 4.21 read it as a year), so convert four-digit year strings to Date objects.
function yearToDate(value) {
  if (typeof value === 'string' && /^\d{4}$/.test(value)) {
    var d = new Date(2000, 0, 1);    // local midnight on 1 January, as vis 4.21 parsed "1980"
    d.setFullYear(parseInt(value, 10));
    return d;
  }
  return value;
}

// Load the events from the events.json file
fetch('events.json')
  .then(response => response.json())
  .then(data => {
    // Create a DataSet with the events (events.json keeps its plain year strings)
    var items = new vis.DataSet(data.items.map(function (item) {
      var copy = Object.assign({}, item);
      copy.start = yearToDate(item.start);
      if (item.end !== undefined) copy.end = yearToDate(item.end);
      return copy;
    }));

    // Configuration for the Timeline
    var options = {
      start: yearToDate('1980'),  // Set the initial visible start date
      end: yearToDate('2000'),    // Set the initial visible end date
      min: yearToDate('1800'),    // Set the minimum visible date
      max: yearToDate('2030'),    // Set the maximum visible date
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
  .catch(error => {
    console.error('Error loading events:', error);
    var box = document.getElementById('timeline');
    if (box) box.textContent = 'The events could not be loaded from events.json.';
  });
