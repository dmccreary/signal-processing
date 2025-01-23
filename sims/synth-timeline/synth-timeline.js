const events = [
  {
    year: 1920,
    title: "Theremin Invented",
    description: "Leon Theremin creates the first electronic instrument controlled without physical contact",
    category: "Early Innovations"
  },
  {
    year: 1957,
    title: "RCA Mark II Sound Synthesizer",
    description: "First programmable electronic synthesizer using punch paper tape for control",
    category: "Early Innovations"
  },
  {
    year: 1963,
    title: "Buchla 100 Series Modular",
    description: "Don Buchla creates the first modular synthesizer on the West Coast",
    category: "Early Innovations"
  },
  {
    year: 1964,
    title: "Moog Modular Synthesizer",
    description: "Bob Moog introduces voltage-controlled synthesis with modular design",
    category: "Early Innovations"
  },
  {
    year: 1970,
    title: "Minimoog Model D",
    description: "First portable, integrated synthesizer, revolutionizing live performance",
    category: "Analog Revolution"
  },
  {
    year: 1971,
    title: "ARP 2600",
    description: "Semi-modular design combining patch points with hardwired connections",
    category: "Analog Revolution"
  },
  {
    year: 1978,
    title: "Prophet-5",
    description: "First fully programmable polyphonic synthesizer with patch memory",
    category: "Analog Revolution"
  },
  {
    year: 1983,
    title: "Yamaha DX7",
    description: "Revolutionary digital FM synthesis with unprecedented clarity",
    category: "Digital Era"
  },
  {
    year: 1984,
    title: "Kurzweil K250",
    description: "First sampling synthesizer with realistic acoustic instrument recreation",
    category: "Digital Era"
  },
  {
    year: 1987,
    title: "Roland D-50",
    description: "Linear Arithmetic Synthesis combining samples with digital waveforms",
    category: "Digital Era"
  }
];

const TimelineEvent = ({ year, title, description, category }) => {
  const colors = {
    'Early Innovations': 'bg-blue-100 border-blue-500',
    'Analog Revolution': 'bg-purple-100 border-purple-500',
    'Digital Era': 'bg-pink-100 border-pink-500'
  };

  return React.createElement('div', { className: 'relative mb-8' },
    React.createElement('div', { className: 'absolute left-0 w-24 text-sm font-bold text-gray-600' }, year),
    React.createElement('div', { className: `ml-32 p-4 rounded-lg border-l-4 ${colors[category]}` },
      React.createElement('h3', { className: 'font-bold text-lg mb-1' }, title),
      React.createElement('p', { className: 'text-sm text-gray-600' }, description)
    )
  );
};

const CategoryLegend = () => {
  const categories = ["Early Innovations", "Analog Revolution", "Digital Era"];
  const colors = {
    "Early Innovations": "bg-blue-500",
    "Analog Revolution": "bg-purple-500",
    "Digital Era": "bg-pink-500"
  };

  return React.createElement('div', { className: 'flex gap-4 mb-6' },
    categories.map(category => 
      React.createElement('div', { key: category, className: 'flex items-center gap-2' },
        React.createElement('div', { className: `w-4 h-4 rounded ${colors[category]}` }),
        React.createElement('span', { className: 'text-sm' }, category)
      )
    )
  );
};

const SynthesizerTimeline = () => {
  return React.createElement('div', { className: 'max-w-4xl mx-auto p-6' },
    React.createElement('h1', { className: 'text-2xl font-bold mb-6' }, 'Synthesizer Innovation Timeline'),
    React.createElement(CategoryLegend),
    events.map((event, index) => 
      React.createElement(TimelineEvent, { key: index, ...event })
    )
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(SynthesizerTimeline));