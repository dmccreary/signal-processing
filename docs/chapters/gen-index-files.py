import os

# Chapter titles
chapter_titles = [
    "Introduction to Signal Processing",
    "Mathematical Foundations",
    "Continuous-Time Signals and Systems",
    "Discrete-Time Signals and Systems",
    "Fourier Analysis",
    "Discrete Fourier Transform (DFT) and Fast Fourier Transform (FFT)",
    "The Z-Transform and Its Applications",
    "Filter Design and Implementation",
    "Adaptive Signal Processing",
    "Stochastic Processes and Random Signals",
    "Spectral Estimation",
    "Time-Frequency Analysis and Wavelets",
    "Multirate Signal Processing",
    "Signal Compression and Coding",
    "Machine Learning in Signal Processing",
    "Deep Learning and Neural Networks",
    "Applications in Communications and Radar",
    "Signal Processing for Multimedia",
    "Emerging Topics in Signal Processing",
    "Integration of AI and Education in Signal Processing"
]

# Directory names
directory_names = [
    "intro-sigproc",
    "math-found",
    "ct-signals-systems",
    "dt-signals-systems",
    "fourier-analysis",
    "dft-fft",
    "z-transform-apps",
    "filter-design-impl",
    "adaptive-sigproc",
    "stoch-proc-rand-sig",
    "spectral-estim",
    "time-freq-wavelets",
    "multirate-sigproc",
    "sigcomp-coding",
    "ml-sigproc",
    "deep-learning-nn",
    "comm-radar-apps",
    "sigproc-multimedia",
    "emerging-sigproc",
    "ai-edu-sigproc"
]

# Chapter contents (from the detailed outline)
chapter_contents = [
    {
        "description": "This chapter provides an overview of signal processing, its importance in modern technology, and its various applications across different fields.",
        "key_sections": {
            "What is Signal Processing?": [
                "Definition of Signals and Systems: Understanding the basic concepts of signals (both continuous and discrete) and systems.",
                "Historical Background: Evolution of signal processing from analog to digital."
            ],
            "Importance of Signal Processing": [
                "Applications in Daily Life: Communication systems, multimedia, healthcare, etc.",
                "Role in Modern Technology: Internet of Things (IoT), autonomous vehicles, and more."
            ],
            "Overview of the Course": [
                "Course Objectives: What students will learn and achieve.",
                "Structure and Prerequisites: How the course is organized and foundational knowledge required."
            ]
        }
    },
    # ... (Include similar dictionaries for chapters 2 to 19)
    {
        "description": "Explores the role of AI in revolutionizing signal processing education, including curriculum development and innovative teaching methods.",
        "key_sections": {
            "AI in Curriculum Development": [
                "Incorporating AI Modules",
                "Interdisciplinary Approaches"
            ],
            "Gamification in Education": [
                "Educational Games for Signal Processing",
                "Engagement and Motivation Strategies"
            ],
            "Large Language Models (LLMs)": [
                "Using LLMs as Educational Tools",
                "Automated Tutoring Systems"
            ],
            "Future Directions": [
                "Lifelong Learning Paradigms",
                "Ethical Considerations in AI Education"
            ]
        }
    }
]

# Ensure that the number of chapters, directories, and contents are the same
assert len(chapter_titles) == len(directory_names) == len(chapter_contents), "Mismatch in list lengths."

base_path = '.'  # Change this to your desired base directory path

for index, (dir_name, chapter_title, content) in enumerate(zip(directory_names, chapter_titles, chapter_contents), start=1):
    chapter_num = f"{index:02}"
    full_dir_name = f"{chapter_num}-{dir_name}"
    dir_path = os.path.join(base_path, full_dir_name)
    
    # Create the directory if it doesn't exist
    os.makedirs(dir_path, exist_ok=True)
    
    # Prepare the content for index.md
    md_lines = []
    md_lines.append(f"# {chapter_title}\n")
    md_lines.append(f"**Description**: {content['description']}\n")
    md_lines.append("## Key Sections\n")
    
    for section_title, subsections in content['key_sections'].items():
        md_lines.append(f"### {section_title}\n")
        for subsection in subsections:
            md_lines.append(f"- {subsection}\n")
        md_lines.append("\n")  # Add an empty line for spacing
    
    index_md_content = '\n'.join(md_lines)
    
    # Write the content to index.md in the directory
    index_md_path = os.path.join(dir_path, 'index.md')
    with open(index_md_path, 'w', encoding='utf-8') as f:
        f.write(index_md_content)
    
    print(f"Created index.md in '{full_dir_name}' with the chapter content.")

