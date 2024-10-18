import os

# Get a list of all entries in the current directory
entries = os.listdir('.')

# Filter the list to include only directories
subdirectories = [entry for entry in entries if os.path.isdir(entry)]

for subdir in subdirectories:
    index_md_path = os.path.join(subdir, 'index.md')
    if not os.path.exists(index_md_path):
        # Create a new index.md file
        with open(index_md_path, 'w', encoding='utf-8') as f:
            # Customize the content as needed
            f.write(f"# {subdir}\n\n")
            f.write("This is the index file for this chapter.\n")
        print(f"Created index.md in '{subdir}'.")
    else:
        print(f"index.md already exists in '{subdir}', skipping.")

