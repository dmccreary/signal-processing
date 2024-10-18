import os

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

base_path = '.'  # Change this to your desired base directory path

for index, dir_name in enumerate(directory_names, start=1):
    chapter_num = f"{index:02}"  # Formats the chapter number with leading zero (e.g., 01, 02, ..., 20)
    full_dir_name = f"{chapter_num}-{dir_name}"
    dir_path = os.path.join(base_path, full_dir_name)
    
    try:
        os.makedirs(dir_path, exist_ok=True)
        print(f"Directory '{full_dir_name}' has been created or already exists.")
    except Exception as e:
        print(f"Failed to create directory '{full_dir_name}': {e}")
