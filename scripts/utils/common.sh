#!/bin/bash
#-------------------------------------------------------------------------------
# This script is used to provide common functions and variables for all scripts.
# This file should be sourced at the beginning of all scripts as follows:
#
# ```bash
# #!/bin/bash
# source scripts/utils/common.sh
# ...
# ```
#
# The following variables and functions are made available:
# - $PROJECT_ROOT: The absolute path to the project root
# - $SCRIPTS_DIR: The absolute path to the scripts directory
# - get_project_root(): Returns the project root directory
# - get_scripts_dir(): Returns the scripts directory
# - run_vite_script(...args): Runs a .ts script with the given arguments in a
#     vite-node environment (a Node environment using the same .env file loaded
#     by Vite)
#-------------------------------------------------------------------------------

# Get the directory of this script
COMMON_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"

# Get project root (go up from scripts/utils to project root)
PROJECT_ROOT="$(scripts/utils/get-project-root.sh)"

# ------------------------------------------------------------------------------
# Export common variables
# ------------------------------------------------------------------------------
export PROJECT_ROOT
export SCRIPTS_DIR="${PROJECT_ROOT}/scripts"

# ------------------------------------------------------------------------------
# Common functions
# ------------------------------------------------------------------------------
# Returns the project root directory
get_project_root() {
  echo "$PROJECT_ROOT"
}

# Returns the scripts directory
get_scripts_dir() {
  echo "$SCRIPTS_DIR"
}

# Runs a .ts script with the given arguments in a vite-node environment
run_vite_script() {
  $SCRIPTS_DIR/utils/run-vite-script.sh "$@"
}