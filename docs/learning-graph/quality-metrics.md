# Learning Graph Quality Metrics

**Analysis Date**: 2025-11-13

**Total Concepts**: 200

## Summary Statistics

- **Foundational Concepts** (zero dependencies): 1
- **Concepts with Dependencies**: 199
- **Average Dependencies per Concept**: 1.31
- **Maximum Dependency Chain Length**: 11
- **Orphaned Nodes** (nothing depends on them): 112

## Foundational Concepts

These concepts have no prerequisites and serve as entry points:

- **1**: Real Numbers

## Top 10 Most Depended-Upon Concepts

These concepts are prerequisites for many other concepts:

| Rank | ConceptID | Label | Indegree |
|------|-----------|-------|----------|
| 1 | 26 | Signals | 28 |
| 2 | 131 | Filters | 19 |
| 3 | 27 | Systems | 19 |
| 4 | 1 | Real Numbers | 13 |
| 5 | 98 | Fourier Transform | 8 |
| 6 | 29 | Discrete-Time Signals | 7 |
| 7 | 117 | Z-Transform | 6 |
| 8 | 100 | Discrete Fourier Transform | 6 |
| 9 | 90 | Quantization | 6 |
| 10 | 82 | Sampling Rate | 6 |

## Orphaned Nodes (Potential Dead Ends)

These concepts have dependencies but nothing depends on them:

- **5**: Phasors
- **11**: Differential Equations
- **12**: Partial Derivatives
- **18**: Standard Deviation
- **21**: Logarithmic Functions
- **22**: Series and Sequences
- **23**: Eigenvalues and Eigenvectors
- **24**: Inner Product
- **25**: Norms and Metrics
- **30**: Analog Signals
- **33**: Aperiodic Signals
- **34**: Even Signals
- **35**: Odd Signals
- **36**: Energy Signals
- **37**: Power Signals
- **40**: Sinusoidal Signals
- **41**: Exponential Signals
- **43**: Time Shifting
- **44**: Time Scaling
- **45**: Signal Amplitude

## Quality Assessment

**Overall Quality Score**: 75/100 - ACCEPTABLE

### Issues Identified

- Many orphaned nodes (112), these should lead to higher-level concepts
- Low average dependencies (1.31), graph may be too linear

## Recommendations

- The graph is a valid DAG (no cycles detected)
- Dependencies represent meaningful prerequisite relationships
- Multiple learning pathways exist through the material
- Start learning with any of the 1 foundational concepts
