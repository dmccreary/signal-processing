# Signal Processing Learning Graph

## Overview

This directory contains a comprehensive learning graph for an undergraduate signal processing course with AI integration. The graph consists of **200 concepts** organized into a pedagogically-sound dependency structure.

## Generated Files

### Core Data Files

1. **`course-concepts-v1.md`**
   - Numbered list of all 200 concepts (IDs 1-200)
   - Organized into 10 major topic areas
   - Each concept label is ≤32 characters in Title Case
   - Can be used as reference for concept IDs

2. **`concept-dependencies.csv`**
   - Complete dependency graph in CSV format
   - Columns: `ConceptID`, `ConceptLabel`, `Dependencies`, `TaxonomyID`
   - Dependencies are pipe-delimited prerequisite IDs (e.g., "1|5|12")
   - Validated as a Directed Acyclic Graph (DAG) with no cycles
   - 6 foundational concepts with no prerequisites
   - 194 concepts with 1-4 prerequisites each

3. **`concept-taxonomy.md`**
   - Definitions of 12 taxonomy categories
   - Each category has a 3-5 letter abbreviation (TaxonomyID)
   - Describes the scope and purpose of each category
   - Guidelines for balanced distribution

### Analysis Reports

4. **`quality-metrics.md`**
   - Comprehensive quality validation report
   - DAG structure verification (no cycles)
   - Dependency chain analysis (longest path: 12 concepts)
   - Indegree/outdegree distributions
   - Orphaned node detection
   - Connected component analysis

5. **`taxonomy-distribution.md`**
   - Detailed taxonomy distribution analysis
   - Visual distribution charts
   - Balance assessment (all categories <30%)
   - Category-by-category concept listings
   - Recommendations for educational use

## Learning Graph Statistics

- **Total Concepts**: 200
- **Foundational Concepts**: 6 (no prerequisites)
- **Average Dependencies**: 1.91 per concept
- **Maximum Chain Length**: 12 concepts
- **Connected Components**: 1 (fully connected graph)
- **Taxonomies**: 12 categories

## Taxonomy Distribution

| Category | ID | Count | % |
|----------|-----|-------|---|
| Signal Fundamentals | SIG | 33 | 16.5% |
| Systems Theory | SYS | 29 | 14.5% |
| Mathematical Foundations | MATH | 27 | 13.5% |
| Filtering Fundamentals | FILT | 26 | 13.0% |
| Fourier Analysis | FOUR | 22 | 11.0% |
| Sampling and Quantization | SAMP | 15 | 7.5% |
| Filter Design | FDES | 15 | 7.5% |
| Other Transforms | TRANS | 13 | 6.5% |
| Advanced DSP Topics | ADV | 9 | 4.5% |
| AI and Machine Learning | AI | 7 | 3.5% |
| Applications | APP | 3 | 1.5% |
| Miscellaneous | MISC | 1 | 0.5% |

## Usage

### For Visualization

The CSV file can be imported into graph visualization tools:
- **vis.js**: Use the existing graph viewer in `/docs/sims/graph-viewer/`
- **Cytoscape.js**: For advanced network analysis
- **D3.js**: For custom interactive visualizations
- **Gephi**: For network analysis and layout

### For Curriculum Design

1. Use taxonomy categories to organize course modules
2. Follow dependency chains for learning sequence
3. Identify prerequisite concepts for any topic
4. Create multiple learning pathways through the graph

### For Assessment

1. Map quiz questions to concept IDs
2. Track student mastery by concept
3. Identify knowledge gaps using dependency structure
4. Generate adaptive assessments based on prerequisites

### For Interactive Learning

1. Color-code concepts by taxonomy in visualizations
2. Show/hide categories for focused learning
3. Highlight learning paths from foundations to goals
4. Enable concept-by-concept navigation

## Python Analysis Scripts

Located in `/src/learning-graph-reports/`:

### `analyze_graph.py`
Generates comprehensive quality metrics including:
- DAG validation
- Indegree/outdegree analysis
- Dependency chain calculations
- Orphaned node detection
- Connected component analysis

**Usage**:
```bash
python3 src/learning-graph-reports/analyze_graph.py [input_csv] [output_md]
```

### `add_taxonomy.py`
Adds taxonomy IDs to concept dependency CSV based on intelligent keyword matching.

**Usage**:
```bash
python3 src/learning-graph-reports/add_taxonomy.py [input_csv] [output_csv]
```

### `taxonomy_distribution.py`
Generates detailed taxonomy distribution reports with visual charts and recommendations.

**Usage**:
```bash
python3 src/learning-graph-reports/taxonomy_distribution.py [input_csv] [output_md]
```

## Course Information

**Course**: Introduction to Signal Processing with Generative AI
**Level**: Undergraduate (Electrical Engineering)
**Credits**: 3
**Focus**: Interactive learning through AI-powered simulations

### Prerequisites
- Introductory Electrical Engineering or Physics
- Basic Calculus and Linear Algebra
- Programming Basics (Python or MATLAB)

### Learning Objectives
18 objectives organized by Bloom's 2001 Taxonomy:
- Remembering (3 objectives)
- Understanding (3 objectives)
- Applying (3 objectives)
- Analyzing (3 objectives)
- Evaluating (3 objectives)
- Creating (3 objectives)

## Graph Structure

### Foundational Concepts (No Prerequisites)
1. Real Numbers
6. Vectors
9. Differential Calculus
10. Integral Calculus
13. Probability Theory
19. Trigonometry

### Most Connected Concepts (High Indegree)
Concepts that enable the most other concepts:
- **Filtering** → enables 35 concepts
- **Signals** → enables 28 concepts
- **Fourier Transform** → enables 21 concepts
- **Systems** → enables 17 concepts

### Example Learning Paths

**Path 1: Foundations to FFT** (6 steps)
Real Numbers → Signals → Periodic Signals → Fourier Series → Fourier Transform → DFT → FFT

**Path 2: Foundations to Neural Networks** (6 steps)
Vectors → Matrices → Linear Algebra → Machine Learning → Neural Networks → Deep Learning

**Path 3: Foundations to Adaptive Filters** (8 steps)
Real Numbers → Signals → Systems → Frequency Response → Filtering → Adaptive Filtering

## Data Format

### CSV Structure
```csv
ConceptID,ConceptLabel,Dependencies,TaxonomyID
1,Real Numbers,,MATH
2,Complex Numbers,1,MATH
4,Euler's Formula,2|19|20,MATH
...
```

### Dependencies Format
- Empty string for foundational concepts
- Pipe-delimited list of prerequisite ConceptIDs: "1|5|12"
- All referenced IDs must exist in the graph
- No self-dependencies allowed
- Must form a DAG (no cycles)

## Validation

All data files have been validated for:
- ✅ No self-dependencies
- ✅ No cycles (valid DAG)
- ✅ All dependency IDs exist
- ✅ Single connected component
- ✅ Balanced taxonomy distribution
- ✅ Pedagogically sound prerequisites

## Updates and Maintenance

To update the learning graph:

1. **Edit concepts**: Modify `course-concepts-v1.md`
2. **Update dependencies**: Edit `concept-dependencies.csv`
3. **Re-run validation**: `python3 src/learning-graph-reports/analyze_graph.py`
4. **Update taxonomy** (if needed): `python3 src/learning-graph-reports/add_taxonomy.py`
5. **Regenerate reports**: `python3 src/learning-graph-reports/taxonomy_distribution.py`

## License and Attribution

Generated using the Learning Graph Generator skill for educational use in signal processing instruction.

**Course**: Signal Processing with AI
**Generated**: October 2025
**Tool**: learning-graph-generator skill
**Institution**: Educational use

---

For questions or updates, refer to the course documentation in `/docs/course-description.md`
