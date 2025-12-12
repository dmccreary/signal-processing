!#/bin/bash

# all files including hidden files
# find . -type f -size +100k -exec ls -lh {} \; | awk '{print $5, $9}' | sort -h

# skip hidden files
# find . -type f -size +100k -not -path './.cache/*' -not -path './.git/*' - exec ls -lh {} \; | awk '{print $5, $9}' | sort -h

# find . -type f -size +100k -not -path "./.cache/*" -not -path "./.git/*" -exec ls -lh {} \; 2>/dev/null | awk '{print $5, $9}' | sort -h

# find . -path ./.cache -prune -o -path ./.git -prune -o -type f -size +100k -print -exec ls -lh {} \; | awk '{print $5, $9}' | sort -h

find . -type f -size +100k -exec ls -lh {} \; | awk '{print $5, $9}' | egrep -Ev '\./(\.cache|\.git|site)/' | sort -h
