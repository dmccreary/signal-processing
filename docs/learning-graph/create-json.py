#!/usr/bin/env python3
"""
Create learning-graph.json from CSV with metadata and taxonomy
"""

import csv
import json

def create_learning_graph_json():
    # Load metadata
    with open('metadata.json', 'r') as f:
        metadata = json.load(f)

    # Load taxonomy config
    with open('taxonomy-config.json', 'r') as f:
        tax_config = json.load(f)

    # Create groups section
    groups = {}
    for tax_id, name in tax_config['names'].items():
        color = tax_config['colors'][tax_id]
        # Determine font color based on background
        font_color = 'white' if tax_id in ['MATH', 'SYS', 'SAMP', 'XFRM', 'RAND', 'ADVN', 'APPL'] else 'black'

        groups[tax_id] = {
            "classifierName": name,
            "color": color,
            "font": {"color": font_color}
        }

    # Read CSV and create nodes and edges
    nodes = []
    edges = []

    with open('learning-graph.csv', 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            concept_id = int(row['ConceptID'])
            label = row['ConceptLabel']
            taxonomy = row['TaxonomyID']
            dependencies = row['Dependencies']

            # Create node
            node = {
                "id": concept_id,
                "label": label,
                "group": taxonomy
            }
            nodes.append(node)

            # Create edges from dependencies
            if dependencies:
                dep_ids = [int(d) for d in dependencies.split('|')]
                for dep_id in dep_ids:
                    edge = {
                        "from": dep_id,
                        "to": concept_id,
                        "arrows": "to"
                    }
                    edges.append(edge)

    # Create complete JSON structure
    learning_graph = {
        "metadata": metadata,
        "groups": groups,
        "nodes": nodes,
        "edges": edges
    }

    # Write JSON file
    with open('learning-graph.json', 'w') as f:
        json.dump(learning_graph, f, indent=2)

    print(f"✅ Created learning-graph.json")
    print(f"   - Metadata: {metadata['title']}")
    print(f"   - Groups: {len(groups)}")
    print(f"   - Nodes: {len(nodes)}")
    print(f"   - Edges: {len(edges)}")

    # Count foundational concepts
    foundational = [n for n in nodes if not any(e['to'] == n['id'] for e in edges
                                                 if e['from'] < n['id'])]
    print(f"   - Foundational concepts: {len([n for n in nodes if n['id'] in [1]])}")

if __name__ == '__main__':
    create_learning_graph_json()
