# Learning Graph for Signal Processing

Welcome to the learning graph section for **Introduction to Signal Processing with AI**. This section contains a comprehensive knowledge graph of 200 concepts that map the learning dependencies and structure of this course.

## What is a Learning Graph?

A learning graph is a directed acyclic graph (DAG) that represents:

- **Concepts**: The key topics and ideas in the course (nodes)
- **Dependencies**: Prerequisites relationships between concepts (edges)
- **Taxonomies**: Categorical groupings for organizing concepts
- **Learning Paths**: Multiple routes through the material based on your goals

## Course Learning Graph

This learning graph contains:

- **200 Concepts** organized into 12 taxonomies
- **262 Dependency Relationships** showing prerequisite connections
- **12 Concept Categories** for logical organization
- **Quality Score: 75/100** - Valid DAG with good structure

## Files in this Section

### Core Learning Graph Files

- **[learning-graph.json](./learning-graph.json)** - Complete learning graph in vis-network.js JSON format
- **[learning-graph.csv](./learning-graph.csv)** - Tabular format with ConceptID, Label, Dependencies, and TaxonomyID

### Documentation and Reports

- **[concept-list.md](./concept-list.md)** - Numbered list of all 200 concepts
- **[concept-taxonomy.md](./concept-taxonomy.md)** - Definitions of the 12 taxonomic categories
- **[course-description-assessment.md](./course-description-assessment.md)** - Quality assessment (Score: 93/100)
- **[quality-metrics.md](./quality-metrics.md)** - Graph structure analysis and validation
- **[taxonomy-distribution.md](./taxonomy-distribution.md)** - Distribution analysis across categories

### Configuration Files

- **[metadata.json](./metadata.json)** - Course metadata (Dublin Core fields)
- **[taxonomy-config.json](./taxonomy-config.json)** - Color scheme and category names

## The 12 Taxonomies

| TaxonomyID | Category | Concepts | Percentage |
|------------|----------|----------|------------|
| MATH | Mathematical Foundations | 25 | 12.5% |
| SIG | Signal Fundamentals | 25 | 12.5% |
| FILT | Filter Design | 25 | 12.5% |
| SYS | System Properties | 20 | 10.0% |
| FOUR | Fourier Analysis | 20 | 10.0% |
| SAMP | Sampling and Quantization | 15 | 7.5% |
| XFRM | Advanced Transforms | 15 | 7.5% |
| ADVN | Advanced Topics | 15 | 7.5% |
| CONV | Convolution and Correlation | 10 | 5.0% |
| ADAP | Adaptive Processing | 10 | 5.0% |
| RAND | Stochastic Processes | 10 | 5.0% |
| APPL | Applications and AI | 10 | 5.0% |

## Key Metrics

### Foundational Concepts

There is **1 foundational concept** with no prerequisites:

- **Real Numbers** - The starting point for all mathematical concepts

### Most Important Concepts

Top 10 concepts by number of dependent concepts:

1. **Signals** (28 dependencies) - Core concept for signal types
2. **Filters** (19 dependencies) - Essential for signal processing
3. **Systems** (19 dependencies) - Foundation for system analysis
4. **Real Numbers** (13 dependencies) - Mathematical foundation
5. **Fourier Transform** (8 dependencies) - Key frequency analysis tool
6. **Discrete-Time Signals** (7 dependencies) - Digital signal foundation
7. **Z-Transform** (6 dependencies) - Discrete system analysis
8. **Discrete Fourier Transform** (6 dependencies) - Practical frequency analysis
9. **Quantization** (6 dependencies) - ADC foundation
10. **Sampling Rate** (6 dependencies) - Digital signal theory

### Dependency Chain

The **maximum dependency chain length is 11 concepts**, meaning the deepest learning path requires mastering 11 sequential concepts.

## Using the Learning Graph

### For Students

- **Identify Prerequisites**: See what concepts you need to learn before tackling advanced topics
- **Find Learning Paths**: Discover multiple routes through the material
- **Track Progress**: Mark concepts as you master them
- **Understand Connections**: See how concepts relate to each other

### For Instructors

- **Course Planning**: Design curriculum based on concept dependencies
- **Assessment Design**: Create tests that respect prerequisite relationships
- **Personalized Learning**: Adapt content to student backgrounds
- **Gap Analysis**: Identify missing prerequisites for struggling students

### Interactive Visualization

To explore the learning graph interactively:

1. Open the [Graph Viewer](../sims/graph-viewer/index.md) (if available)
2. Load `learning-graph.json`
3. Filter by taxonomy to focus on specific topic areas
4. Search for concepts by name
5. Visualize dependency paths

## Quality Assessment

**Course Description Quality**: 93/100 - Excellent

- Complete Bloom's Taxonomy coverage (all 6 levels)
- 50 well-defined topics
- Clear prerequisites and boundaries
- Sufficient depth for 200+ concepts

**Learning Graph Quality**: 75/100 - Acceptable

- ✅ Valid DAG (no cycles)
- ✅ Balanced taxonomy distribution
- ✅ Meaningful dependency relationships
- ⚠️ 112 orphaned nodes (concepts that lead to no higher concepts)
- ⚠️ Low average dependencies (1.31) - graph could be more interconnected

## Generation Process

This learning graph was generated using AI assistance through the following steps:

1. **Course Description Analysis** - Assessed completeness and quality
2. **Concept Enumeration** - Generated 200 pedagogically sound concepts
3. **Dependency Mapping** - Created prerequisite relationships
4. **Quality Validation** - Verified DAG structure and metrics
5. **Taxonomy Creation** - Organized into 12 balanced categories
6. **JSON Generation** - Created vis-network.js compatible format

## Next Steps

### Recommended Improvements

1. **Add More Cross-Dependencies**: Connect orphaned concepts to advanced applications
2. **Create Learning Modules**: Group related concepts into teachable units
3. **Add Concept Descriptions**: Provide detailed definitions for each concept
4. **Create Assessment Items**: Map quiz questions to specific concepts
5. **Build Interactive Viewer**: Enable graph exploration and filtering

### Integration with Course Materials

- Link concepts to chapter sections
- Create concept-specific MicroSims
- Add glossary terms for each concept
- Map learning objectives to concept clusters
- Create pre-assessment based on foundational concepts

## License

This learning graph is licensed under **CC BY-NC-SA 4.0 DEED** (Creative Commons Attribution-NonCommercial-ShareAlike 4.0).

---

**Generated**: 2025-11-13
**Version**: 1.0
**Course**: Introduction to Signal Processing with AI
