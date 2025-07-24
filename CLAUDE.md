# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an educational website for "Signal Processing with AI" - a college-level textbook hosted on GitHub Pages using MkDocs Material theme. The site contains interactive microsimulations, educational content, stories, and circuit diagrams to teach signal processing concepts.

## Development Commands

### MkDocs Operations
- **Build site**: `mkdocs build` - Creates the site in `site/` directory
- **Local development**: `mkdocs serve` - Serves at http://localhost:8000 with auto-reload
- **Deploy to GitHub Pages**: `mkdocs gh-deploy` - Pushes to gh-pages branch (does not commit source)

### Environment Setup
```bash
# If using conda (recommended for this project)
conda create -n mkdocs python=3
conda activate mkdocs
pip install mkdocs "mkdocs-material[imaging]"

# For social cards on Mac (if needed)
brew install cairo freetype libffi libjpeg libpng zlib
export DYLD_FALLBACK_LIBRARY_PATH=/opt/homebrew/lib
```

### Python Scripts
- **Generate chapter structure**: `python docs/chapters/gen-index-files.py` - Creates index.md files for all 20 chapters
- **CSV to JSON conversion**: `python src/csv-to-json/csv-to-json.py` - Converts concept data formats
- **Sort glossary**: `python src/glossary/sort-glossary.py` - Alphabetizes glossary entries

## Architecture and Structure

### Content Organization
- **docs/chapters/**: 20 numbered chapters (01-20) covering signal processing topics from intro to AI education
- **docs/sims/**: Interactive P5.js microsimulations with lesson plans and educational objectives
- **docs/stories/**: Visual storytelling content about signal processing history (Shannon, Hedy Lamarr, FFT, etc.)
- **docs/circuits/**: Circuit diagrams using Schemadraw library for educational examples
- **docs/prompts/**: AI prompts used to generate educational content and assessments

### Microsimulation Architecture
- **Template structure**: Each sim has `index.md`, `main.html`, and JavaScript file
- **P5.js framework**: All interactive simulations use P5.js with responsive design
- **Standard layout**: 670px width, drawing area + 75px control height, sliders positioned consistently
- **Embedding**: Each sim provides iframe code for external use
- **Educational integration**: Comprehensive lesson plans with objectives, assessment rubrics, and extension activities

### Technical Components
- **Custom MkDocs plugin**: `plugins/social_override.py` - Overrides social media cards with custom images
- **Material theme**: Uses Material for MkDocs with custom CSS/JS in `docs/css/extra.css` and `docs/js/extra.js`
- **Image optimization**: Screenshots compressed via TinyPNG for web performance
- **LaTeX support**: MathJax integration for mathematical equations

### Data and Content Management
- **Concept graphs**: JSON data structures for signal processing concept dependencies
- **Structured metadata**: Each page has frontmatter with title, description, and social media images
- **Timeline data**: JSON format for historical events in signal processing
- **Glossary system**: Alphabetized markdown files with term definitions

### Development Patterns
- **Responsive design**: All simulations adapt to container width using `windowResized()` and `updateCanvasSize()`
- **Educational focus**: Each simulation includes detailed lesson plans, learning objectives, and assessment criteria
- **Consistent styling**: Material theme with maroon/gold color scheme, consistent navigation structure
- **Version control**: Git-based workflow with GitHub Pages deployment, no automated CI/CD currently enabled

### File Naming Conventions
- **Chapters**: `##-descriptive-name/index.md` (e.g., `01-intro-sigproc/index.md`)
- **Simulations**: `descriptive-name/` containing `index.md`, `main.html`, `.js` file, and `.png` screenshot
- **Assets**: Images in `docs/img/`, simulation screenshots co-located with sim files

## Common Development Tasks

When adding new microsimulations:
1. Copy `docs/sims/template/` structure
2. Update lesson plan in `index.md` with educational objectives
3. Implement P5.js code following responsive design patterns
4. Create screenshot for social media sharing
5. Add navigation entry to `mkdocs.yml`

When adding educational content:
1. Follow existing chapter structure with key sections
2. Include mathematical concepts with LaTeX via MathJax
3. Add relevant circuit diagrams using Schemadraw when applicable
4. Cross-reference related simulations and stories