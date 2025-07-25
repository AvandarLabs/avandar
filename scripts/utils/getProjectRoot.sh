#!/bin/bash

# This script finds the project root directory by searching upwards for a
# `package.json` file. It then prints the absolute path to that directory.

# Get the directory of the currently executing script to start the search.
SEARCH_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"

# Traverse up from the script's directory to find the project root.
while [ ! -f "$SEARCH_DIR/package.json" ]; do
  SEARCH_DIR="$(dirname "$SEARCH_DIR")"

  # If we've reached the filesystem root and haven't found it, error out.
  if [ "$SEARCH_DIR" == "/" ]; then
    echo "Error: Could not find project root containing package.json." >&2
    exit 1
  fi
done

# Output the found project root directory path.
echo "$SEARCH_DIR"