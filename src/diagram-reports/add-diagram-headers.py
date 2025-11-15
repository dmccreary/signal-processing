#!/usr/bin/env python3
"""
Add '#### Diagram: NAME' headers before <details> blocks in chapter files.

This script processes all chapter index.md files and adds a level 4 header
before each <details> block, extracting the name from the <summary> element.
"""

import re
from pathlib import Path

def extract_summary_name(summary_text):
    """Extract the name from summary text, removing 'MicroSim:' or 'Diagram:' prefix"""
    # Remove common prefixes
    name = summary_text.strip()
    name = re.sub(r'^(MicroSim|Diagram):\s*', '', name, flags=re.IGNORECASE)
    return name.strip()

def process_chapter_file(file_path):
    """Process a single chapter file to add diagram headers"""
    print(f"\nProcessing: {file_path.parent.name}/index.md")

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Split into lines for easier processing
    lines = content.split('\n')
    new_lines = []
    i = 0
    changes_made = 0

    while i < len(lines):
        line = lines[i]

        # Check if this is a <details> block
        if line.strip().startswith('<details'):
            # Check if the previous non-empty line is already a #### Diagram: header
            prev_line_idx = i - 1
            while prev_line_idx >= 0 and lines[prev_line_idx].strip() == '':
                prev_line_idx -= 1

            has_header = False
            if prev_line_idx >= 0:
                prev_line = lines[prev_line_idx].strip()
                if prev_line.startswith('#### Diagram:'):
                    has_header = True

            if not has_header:
                # Look for the <summary> tag in the next few lines
                summary_match = None
                for j in range(i, min(i + 5, len(lines))):
                    summary_match = re.search(r'<summary>(.*?)</summary>', lines[j])
                    if summary_match:
                        break

                if summary_match:
                    summary_text = summary_match.group(1)
                    diagram_name = extract_summary_name(summary_text)

                    # Add the header before the <details> block
                    # First, preserve any empty lines before <details>
                    while new_lines and new_lines[-1].strip() == '':
                        new_lines.pop()

                    new_lines.append('')
                    new_lines.append(f'#### Diagram: {diagram_name}')
                    new_lines.append('')
                    changes_made += 1
                    print(f"  Added header: #### Diagram: {diagram_name}")

        new_lines.append(line)
        i += 1

    if changes_made > 0:
        # Write back to file
        new_content = '\n'.join(new_lines)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"  ✓ Updated {changes_made} details block(s)")
    else:
        print(f"  ✓ No changes needed (all headers already present)")

    return changes_made

def main():
    """Process all chapter files"""
    chapters_dir = Path('docs/chapters')

    if not chapters_dir.exists():
        print(f"Error: Chapters directory not found: {chapters_dir}")
        return 1

    # Get all numbered chapter directories
    chapter_dirs = sorted([d for d in chapters_dir.iterdir()
                          if d.is_dir() and re.match(r'^\d{2}-', d.name)])

    print(f"Found {len(chapter_dirs)} chapter directories")

    total_changes = 0
    for chapter_dir in chapter_dirs:
        index_file = chapter_dir / 'index.md'
        if index_file.exists():
            changes = process_chapter_file(index_file)
            total_changes += changes

    print(f"\n{'='*60}")
    print(f"SUMMARY: Added {total_changes} diagram headers across all chapters")
    print(f"{'='*60}")

    return 0

if __name__ == '__main__':
    exit(main())
