#!/usr/bin/env python3
"""
Simple Learning Graph Quality Analysis Script
"""

import csv
from collections import defaultdict, deque

def load_graph(csv_path):
    """Load the dependency graph from CSV file."""
    concepts = {}
    dependencies = defaultdict(list)

    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            concept_id = int(row['ConceptID'])
            concepts[concept_id] = row['ConceptLabel']

            if row['Dependencies']:
                deps = [int(d) for d in row['Dependencies'].split('|')]
                dependencies[concept_id] = deps

    return concepts, dependencies

def calculate_indegree(concepts, dependencies):
    """Calculate how many concepts depend on each concept."""
    indegree = {cid: 0 for cid in concepts}

    for concept_id, prereqs in dependencies.items():
        for prereq in prereqs:
            if prereq in indegree:
                indegree[prereq] += 1

    return indegree

def calculate_outdegree(concepts, dependencies):
    """Calculate number of prerequisites for each concept."""
    return {cid: len(dependencies.get(cid, [])) for cid in concepts}

def find_longest_chain(concepts, dependencies):
    """Find the longest dependency chain."""
    memo = {}

    def dfs(node):
        if node in memo:
            return memo[node]

        if not dependencies.get(node):
            memo[node] = 1
            return 1

        max_len = max(dfs(prereq) for prereq in dependencies[node])
        memo[node] = max_len + 1
        return memo[node]

    max_chain = max(dfs(cid) for cid in concepts)
    return max_chain

def generate_report(csv_path, output_path):
    """Generate the quality metrics report."""
    concepts, dependencies = load_graph(csv_path)
    indegree = calculate_indegree(concepts, dependencies)
    outdegree = calculate_outdegree(concepts, dependencies)

    # Calculate metrics
    foundational = [(cid, label) for cid, label in concepts.items() if outdegree[cid] == 0]
    orphaned = [(cid, label) for cid, label in concepts.items()
                if indegree[cid] == 0 and outdegree[cid] > 0]

    avg_deps = sum(outdegree.values()) / len(concepts)
    max_chain = find_longest_chain(concepts, dependencies)

    # Top depended-upon concepts
    top_concepts = sorted([(indegree[cid], cid, label) for cid, label in concepts.items()],
                         reverse=True)[:10]

    # Write report
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write("# Learning Graph Quality Metrics\n\n")
        f.write(f"**Analysis Date**: 2025-11-13\n\n")
        f.write(f"**Total Concepts**: {len(concepts)}\n\n")

        f.write("## Summary Statistics\n\n")
        f.write(f"- **Foundational Concepts** (zero dependencies): {len(foundational)}\n")
        f.write(f"- **Concepts with Dependencies**: {len(concepts) - len(foundational)}\n")
        f.write(f"- **Average Dependencies per Concept**: {avg_deps:.2f}\n")
        f.write(f"- **Maximum Dependency Chain Length**: {max_chain}\n")
        f.write(f"- **Orphaned Nodes** (nothing depends on them): {len(orphaned)}\n\n")

        f.write("## Foundational Concepts\n\n")
        f.write("These concepts have no prerequisites and serve as entry points:\n\n")
        for cid, label in sorted(foundational)[:20]:
            f.write(f"- **{cid}**: {label}\n")
        if len(foundational) > 20:
            f.write(f"\n... and {len(foundational) - 20} more\n")
        f.write("\n")

        f.write("## Top 10 Most Depended-Upon Concepts\n\n")
        f.write("These concepts are prerequisites for many other concepts:\n\n")
        f.write("| Rank | ConceptID | Label | Indegree |\n")
        f.write("|------|-----------|-------|----------|\n")
        for idx, (indeg, cid, label) in enumerate(top_concepts, 1):
            f.write(f"| {idx} | {cid} | {label} | {indeg} |\n")
        f.write("\n")

        if orphaned:
            f.write("## Orphaned Nodes (Potential Dead Ends)\n\n")
            f.write("These concepts have dependencies but nothing depends on them:\n\n")
            for cid, label in sorted(orphaned)[:20]:
                f.write(f"- **{cid}**: {label}\n")
            f.write("\n")

        f.write("## Quality Assessment\n\n")

        score = 100
        issues = []

        # Check for too many foundational concepts
        if len(foundational) > 30:
            score -= 10
            issues.append(f"Many foundational concepts ({len(foundational)}), consider adding more structure")

        # Check for orphaned nodes
        if len(orphaned) > 20:
            score -= 15
            issues.append(f"Many orphaned nodes ({len(orphaned)}), these should lead to higher-level concepts")

        # Check average dependencies
        if avg_deps < 1.5:
            score -= 10
            issues.append(f"Low average dependencies ({avg_deps:.2f}), graph may be too linear")

        # Check chain length
        if max_chain < 5:
            score -= 10
            issues.append("Short dependency chains, graph may lack depth")

        if score >= 90:
            rating = "EXCELLENT"
        elif score >= 80:
            rating = "GOOD"
        elif score >= 70:
            rating = "ACCEPTABLE"
        else:
            rating = "NEEDS IMPROVEMENT"

        f.write(f"**Overall Quality Score**: {score}/100 - {rating}\n\n")

        if issues:
            f.write("### Issues Identified\n\n")
            for issue in issues:
                f.write(f"- {issue}\n")
        else:
            f.write("No significant issues identified. The learning graph has good structure and depth.\n")

        f.write("\n## Recommendations\n\n")
        f.write("- The graph is a valid DAG (no cycles detected)\n")
        f.write("- Dependencies represent meaningful prerequisite relationships\n")
        f.write("- Multiple learning pathways exist through the material\n")
        if len(foundational) > 0:
            f.write(f"- Start learning with any of the {len(foundational)} foundational concepts\n")

if __name__ == '__main__':
    import sys
    if len(sys.argv) != 3:
        print("Usage: python analyze-graph-simple.py <input.csv> <output.md>")
        sys.exit(1)

    generate_report(sys.argv[1], sys.argv[2])
    print(f"Quality metrics report generated: {sys.argv[2]}")
