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

for dir_name in directory_names:
    # Create the directory if it doesn't exist
    os.makedirs(dir_name, exist_ok=True)
    print(f"Directory '{dir_name}' has been created or already exists.")

