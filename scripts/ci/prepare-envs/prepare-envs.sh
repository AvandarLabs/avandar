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

# Names allowed to be empty (optional flags, unset-by-design in CI).
ALLOW_EMPTY_ENV_VAR_NAMES=(
  VITE_FEATURE_FLAGS
)

# Returns 0 if key is listed in ALLOW_EMPTY_ENV_VAR_NAMES.
_is_allowed_empty_env_var() {
  local key="$1"
  local allowed_name=""
  for allowed_name in "${ALLOW_EMPTY_ENV_VAR_NAMES[@]}"; do
    if [[ "$key" == "$allowed_name" ]]; then
      return 0
    fi
  done
  return 1
}

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

  local filtered_keys=()
  local key=""
  for key in "${empty_keys[@]}"; do
    if _is_allowed_empty_env_var "$key"; then
      continue
    fi
    filtered_keys+=("$key")
  done

  if [ ${#filtered_keys[@]} -ne 0 ]; then
    echo "${file}:${filtered_keys[@]}"
  fi
}

# One entry per failing file: "filename:var1 var2 ..." (indexed array avoids
# `set -u` issues with empty associative arrays on some bash versions).
EMPTY_ENV_ENTRIES=()

# Loop through each env file and check for empty env vars.
for envfile in "${ENV_FILES[@]}"; do
  result="$(check_empty_env_vars "$envfile")"
  if [[ -n "$result" ]]; then
    EMPTY_ENV_ENTRIES+=("$result")
  fi
done

if [[ ${#EMPTY_ENV_ENTRIES[@]} -gt 0 ]]; then
  echo "❌ Environment variable checks failed. The following variables are empty:"
  for entry in "${EMPTY_ENV_ENTRIES[@]}"; do
    filename="${entry%%:*}"
    vars_str="${entry#*:}"
    echo "  In $filename:"
    for var in $vars_str; do
      echo "    - $var"
    done
  done
  exit 1
fi

echo "Environments prepared successfully."