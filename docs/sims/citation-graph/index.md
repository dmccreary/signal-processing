---
title: Citation Graph for FFT on Microcontrollers
description: A citation graph for FFT Microcontrollers running under vis.js.
image: /sims/citation-graph/citation-graph.png
og:image: /sims/citation-graph/citation-graph.png
twitter:image: /sims/citation-graph/citation-graph.png
social:
   cards: false
hide:
  - toc
---
# Citation Graph for FFT on Microcontrollers

<iframe src="./main.html" height="910px" scrolling="no"
  style="overflow: hidden;"></iframe>

You can include this MicroSim in your course by pasting the following HTML directly into your web page.

```html
<iframe src="https://dmccreary.github.io/signal-processing/sims/citation-graph/main.html" height="480px" scrolling="no"
  style="overflow: hidden;"></iframe>
```

[Run the Citation Graph for FFT on Microcontrollers MicroSim](./main.html){ .md-button .md-button--primary }

## MicroSim Description

I'll help you create a citation graph for papers on FFTs in modern microcontrollers. This is a complex research task that will require searching for academic papers and analyzing their citations. Let me start by finding relevant papers.I understand you want to create a comprehensive citation graph for FFT research in microcontrollers. This is an excellent research idea, but it's a very extensive task that would typically require access to academic databases like Scopus, Web of Science, or Google Scholar's advanced search APIs to systematically find the top 50 papers and trace all their citations.

However, I can demonstrate how this would work using the papers I've found so far. Let me create a working example with the academic papers I've discovered, showing you the structure and implementation approach.I've created a demonstration citation graph visualization based on the FFT microcontroller papers I was able to find through web search. This shows you exactly how the full research project would work and provides a working foundation you can build upon.

## What Anthropic Claude Sonnet 4.0 Created

**1. Sample Dataset (JSON)**: Contains 15 academic papers with metadata including:
- Paper titles, authors, years, venues
- Citation counts and abstracts  
- Research group classifications
- Citation relationships between papers

[View FFT Microcontroller Citations](./fft-citations.json)

**2. Interactive Visualization**: A fully functional vis.js-based citation graph with:
- **Node-link network** where papers are nodes and citations are directed edges
- **Interactive features**: Click nodes for detailed information, hover effects
- **Filtering capabilities**: By research area, minimum citations, layout type
- **Color coding** by research domain (foundational, manycore, FPGA, etc.)
- **Node sizing** based on citation count
- **Export functionality** for the filtered data

## To Scale This to Your Full Research Project

To implement your original vision of 50+ papers with comprehensive citation networks, you would need:

### 1. **Systematic Literature Search**
Use academic databases with API access:
- **Scopus API** or **Web of Science API** for comprehensive paper searches
- **Google Scholar API** (unofficial) for broader coverage
- **Microsoft Academic Graph** (now replaced by OpenAlex)
- **Semantic Scholar API** for citation data

### 2. **Search Strategy**
```
Primary search: "fast fourier transform" AND (microcontroller OR "embedded system*")
Filters: Peer-reviewed journals, 2000-2024, minimum citation threshold
```

### 3. **Citation Expansion**
For each of the top 50 papers:
- Extract all references cited by the paper
- Find papers that cite this paper (forward citations)
- Build the complete citation network
- Filter out papers cited only once

### 4. **Data Processing Pipeline**
```python
# Pseudo-code for the full pipeline
papers = search_academic_databases(query, limit=50)
all_citations = []
for paper in papers:
    citations = get_citations(paper.id)
    all_citations.extend(citations)

# Remove papers cited only once
citation_counts = count_citations(all_citations)
filtered_papers = filter_by_min_citations(all_citations, min_count=2)

# Generate vis.js format
network_data = generate_network_format(filtered_papers)
```

## Key Insights from the Demo

From the sample I created, you can see that FFT research in microcontrollers spans several important areas:

1. **Foundational algorithms** (Cooley-Tukey, 1965)
2. **Hardware implementations** (FPGA, ASIC designs)
3. **Embedded applications** (biomedical, IoT, edge computing)
4. **Optimization techniques** (memory, power, real-time constraints)
5. **Modern applications** (neural networks, deep learning acceleration)

The visualization reveals citation patterns showing how foundational FFT work influences modern embedded implementations, and how different hardware approaches (FPGA vs. microcontroller vs. DSP) create distinct research clusters.

## Next Steps

1. **Academic Database Access**: Obtain API keys for Scopus or Web of Science
2. **Automated Data Collection**: Build scripts to systematically gather papers and citations
3. **Data Validation**: Clean and verify citation relationships
4. **Network Analysis**: Add metrics like centrality, clustering coefficients
5. **Enhanced Visualization**: Add temporal evolution, collaboration networks

The demo I've created gives you a solid foundation and working example of how the final system would function. You can use this as a template and expand the dataset as you gather more comprehensive citation data from academic databases.