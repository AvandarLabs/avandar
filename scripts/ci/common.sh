source scripts/utils/common.sh

# ------------------------------------------------------------------------------
# Drops any existing `{KEY}=` line from the env file, then appends
# `{KEY}={value}` to the env file.
# Args:
#   $1: The key to replace
#   $2: The value to replace with
#   $3: The env file name to replace in (e.g. ".env.development")
# ------------------------------------------------------------------------------
replace_env_var() {
  local key="$1"
  local value="$2"
  local env_file_name="$3"
  local env_file="$PROJECT_ROOT/$env_file_name"
  local tmp_file
  tmp_file="$(mktemp)"
  grep -v "^${key}=" "$env_file" > "$tmp_file" || true
  mv "$tmp_file" "$env_file"
  echo "${key}=${value}" >> "$env_file"
}