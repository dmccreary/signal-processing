# Signal Processing with AI

[![ArXiv](https://img.shields.io/badge/cs.MA-2402.14034-B31C1C?logo=arxiv&logoColor=B31C1C)](https://arxiv.org/abs/2509.08950)
[![MkDocs](https://img.shields.io/badge/docs-mkdocs-blue)](https://dmccreary.github.io/signal-processing/)
[![Material for MkDocs](https://img.shields.io/badge/material-mkdocs-teal)](https://squidfunk.github.io/mkdocs-material/)
[![GitHub Pages](https://img.shields.io/badge/Hosted%20on-GitHub%20Pages-brightgreen)](https://dmccreary.github.io/signal-processing/)
[![License: CC BY-NC-SA 4.0](https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc-sa/4.0/)

> An innovative educational resource demonstrating how AI can revolutionize signal processing education through interactive microsimulations and intelligent content generation.

## 🌐 Live Website

**[https://dmccreary.github.io/signal-processing/](https://dmccreary.github.io/signal-processing/)**

## 📖 Overview

This repository contains an intelligent textbook on signal processing that serves as a proof-of-concept for AI-enhanced education. Rather than being a traditional textbook, this project demonstrates how generative AI can be used by both instructors and students to create, modify, and enhance educational content in signal processing.

### Key Features

- **📚 20 Comprehensive Chapters** - From basic signal theory to AI applications
- **🎮 Interactive Microsimulations** - Built with P5.js for hands-on learning  
- **📊 Educational Visualizations** - FFT demos, filter designs, and circuit simulations
- **📖 Historical Stories** - Visual narratives about Shannon, Hedy Lamarr, and signal processing pioneers
- **🔧 Circuit Diagrams** - Generated with Schemadraw for analog circuit education
- **🤖 AI-Generated Content** - Lesson plans, assessments, and educational materials
- **📈 Learning Analytics** - Concept dependency graphs and learning pathways

## 🚀 Quick Start

### Prerequisites

- Python 3.x
- Git

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/dmccreary/signal-processing.git
   cd signal-processing
   ```

2. **Set up the environment**
   ```bash
   # Using conda (recommended)
   conda create -n mkdocs python=3
   conda activate mkdocs
   pip install mkdocs "mkdocs-material[imaging]"
   
   # For social cards on macOS (optional)
   brew install cairo freetype libffi libjpeg libpng zlib
   export DYLD_FALLBACK_LIBRARY_PATH=/opt/homebrew/lib
   ```

3. **Run the development server**
   ```bash
   mkdocs serve
   ```
   
4. **Open your browser to** `http://localhost:8000`

### Building and Deployment

```bash
# Build the site
mkdocs build

# Deploy to GitHub Pages
mkdocs gh-deploy
```

## 📁 Project Structure

```
signal-processing/
├── docs/                      # MkDocs content
│   ├── chapters/              # 20 educational chapters
│   ├── sims/                  # Interactive P5.js microsimulations
│   ├── stories/               # Historical narratives with visuals
│   ├── circuits/              # Circuit diagrams and explanations
│   ├── prompts/               # AI prompts for content generation
│   ├── css/                   # Custom styling
│   └── js/                    # Custom JavaScript
├── src/                       # Source utilities
│   ├── csv-to-json/          # Data conversion tools
│   ├── glossary/             # Glossary management
│   └── schemadraw/           # Circuit diagram generation
├── plugins/                   # Custom MkDocs plugins
├── mkdocs.yml                # Site configuration
└── README.md                 # This file
```

## 🎯 Educational Philosophy

This project demonstrates how AI can transform education by:

- **Generating Interactive Content** - Using AI to create simulations and visualizations
- **Personalizing Learning** - Adaptive content based on student needs
- **Enhancing Instructor Productivity** - AI-assisted lesson planning and assessment creation
- **Bridging Theory and Practice** - Interactive demos that make abstract concepts tangible

## 🔧 Technology Stack

- **[MkDocs](https://www.mkdocs.org/)** - Static site generator
- **[Material for MkDocs](https://squidfunk.github.io/mkdocs-material/)** - Modern theme with social cards
- **[P5.js](https://p5js.org/)** - Interactive visualizations and simulations
- **[Schemadraw](https://cdelker.bitbucket.io/SchemDraw/)** - Circuit diagram generation
- **[MathJax](https://www.mathjax.org/)** - Mathematical equation rendering
- **[GitHub Pages](https://pages.github.com/)** - Hosting and deployment

## 🎨 Featured Microsimulations

- **Basic FFT Visualization** - Interactive Fourier transform demonstrations
- **Filter Design Tools** - Real-time filter response visualization
- **Nyquist-Shannon Sampling** - Sampling theorem exploration
- **Convolution Simulator** - Step-by-step convolution process
- **Frequency Detection** - Live audio analysis
- **Circuit Analysis** - RC filters and op-amp configurations

## 🤝 Contributing

We welcome contributions! Please see our [contribution guidelines](docs/how-we-built-this-site.md) for details on:

- Adding new microsimulations
- Creating educational content
- Improving documentation
- Reporting bugs and suggesting features

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Test locally with `mkdocs serve`
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## 📄 License

This work is licensed under a [Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License](https://creativecommons.org/licenses/by-nc-sa/4.0/).

[![CC BY-NC-SA 4.0](https://licensebuttons.net/l/by-nc-sa/4.0/88x31.png)](https://creativecommons.org/licenses/by-nc-sa/4.0/)

## 🙏 Acknowledgments

### Institutions
- **University of Minnesota** - Educational research and development support
- **New York University (NYU)** - For creating and maintaining the P5.js library

### AI Tools and Platforms
- **OpenAI ChatGPT** - Content generation, lesson planning, and educational material development
- **Anthropic Claude Sonnet** - Advanced reasoning and educational content refinement  
- **Claude Code** - Code development, documentation, and project enhancement

### Open Source Libraries
- **P5.js Team** - For the incredible creative coding framework that powers our interactive simulations
- **MkDocs Community** - For the excellent documentation platform
- **Material for MkDocs** - For the beautiful and functional theme

### Special Recognition
We extend our gratitude to the broader signal processing education community, open source contributors, and the researchers advancing AI-enhanced learning methodologies.

---

## 📞 Contact

- **Author**: Dan McCreary
- **Website**: [https://dmccreary.github.io/signal-processing/](https://dmccreary.github.io/signal-processing/)
- **Repository**: [https://github.com/dmccreary/signal-processing](https://github.com/dmccreary/signal-processing)

---

⭐ **Star this repository** if you find it useful for AI-enhanced education!