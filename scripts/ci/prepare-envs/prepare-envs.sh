#!/usr/bin/env bash
# ------------------------------------------------------------------------------
# Calls all nested `prepare-env-*.sh` files to set up the necessary environments
# for the CI pipeline. This is necessary, for example, in order to run a local
# server, Supabase, and playwright during CI/CD for testing.
# ------------------------------------------------------------------------------
source scripts/utils/common.sh

# Exit on error or undefined variable.
set -euo pipefail

echo "Preparing process environment..."
scripts/ci/prepare-envs/prepare-env-process.sh

echo "Preparing development environment..."
scripts/ci/prepare-envs/prepare-env-development.sh

echo "Preparing edge environment..."
scripts/ci/prepare-envs/prepare-env-edge.sh

ENV_FILES=(
  ".env.development"
  ".env.development.edge"
)

# Function that checks that a given file does not have any empty variables.
check_empty_env_vars() {
  local file="$1"
  local empty_keys=()
  if [[ ! -f "$file" ]]; then
    echo "Warning: $file does not exist. Skipping check."
    return 0
  fi
  # Match lines like FOO=   or FOO=""   but skip commented lines (#) and blank lines
  while IFS= read -r line; do
    # Remove leading and trailing whitespace
    line="${line#"${line%%[![:space:]]*}"}"
    line="${line%"${line##*[![:space:]]}"}"
    if [[ -z "$line" ]] || [[ "$line" == \#* ]]; then
      continue
    fi
    # Check for KEY= with nothing after the =
    if [[ "$line" =~ ^([A-Za-z_][A-Za-z0-9_]*)=$ ]]; then
      empty_keys+=("${BASH_REMATCH[1]}")
    # Check for KEY="" (empty quoted string)
    elif [[ "$line" =~ ^([A-Za-z_][A-Za-z0-9_]*)=\"\"$ ]]; then
      empty_keys+=("${BASH_REMATCH[1]}")
    fi
  done < "$file"

  if [ ${#empty_keys[@]} -ne 0 ]; then
    # Output as var= in the output for clarity
    echo "${file}:${empty_keys[@]}"
  fi
}

declare -A EMPTY_VARS

# Loop through each env file and check for empty env vars.
# Add any empty vars to the EMPTY_VARS associative array.
for envfile in "${ENV_FILES[@]}"; do
  result="$(check_empty_env_vars "$envfile")"
  if [[ -n "$result" ]]; then
    filename="${result%%:*}"
    vars_str="${result#*:}"
    IFS=' ' read -ra vars <<< "$vars_str"
    EMPTY_VARS["$filename"]="${vars[*]}"
  fi
done

# Check if there are any entries in the EMPTY_VARS associative array.
# If yes, throw non-zero exit code.
if (( ${#EMPTY_VARS[@]} > 0 )); then
  echo "❌ Environment variable checks failed. The following variables are empty:"
  for file in "${!EMPTY_VARS[@]}"; do
    echo "  In $file:"
    for var in ${EMPTY_VARS[$file]}; do
      echo "    - $var"
    done
  done
  exit 1
fi


echo "Environments prepared successfully."