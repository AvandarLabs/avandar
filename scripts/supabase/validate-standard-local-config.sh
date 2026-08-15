#!/usr/bin/env bash

# Validates the canonical local Supabase identity and ports from TOML on stdin.

set -uo pipefail

validation_output="$(awk '
function trim(value) {
  sub(/^[[:space:]]+/, "", value)
  sub(/[[:space:]]+$/, "", value)
  return value
}

BEGIN {
  expected["project_id"] = "avandar"
  expected["api.port"] = "54321"
  expected["db.port"] = "54322"
  expected["db.shadow_port"] = "54320"
  expected["db.pooler.port"] = "54329"
  expected["studio.port"] = "54323"
  expected["inbucket.port"] = "51634"
  expected["edge_runtime.inspector_port"] = "8083"
  expected["analytics.port"] = "54327"
}

{
  line = $0
  sub(/[[:space:]]*#.*/, "", line)

  if (line ~ /^[[:space:]]*\[[^]]+\][[:space:]]*$/) {
    section = line
    sub(/^[[:space:]]*\[/, "", section)
    sub(/\][[:space:]]*$/, "", section)
    next
  }

  if (line !~ /=/) {
    next
  }

  key = line
  sub(/=.*/, "", key)
  key = trim(key)

  value = line
  sub(/^[^=]*=/, "", value)
  value = trim(value)
  if (value ~ /^".*"$/) {
    sub(/^"/, "", value)
    sub(/"$/, "", value)
  }

  config_key = section == "" ? key : section "." key
  if (config_key in expected) {
    actual[config_key] = value
  }
}

END {
  has_errors = 0
  for (config_key in expected) {
    if (!(config_key in actual)) {
      printf "%s must be %s (is missing)\n", config_key, expected[config_key]
      has_errors = 1
      continue
    }

    if (actual[config_key] != expected[config_key]) {
      printf "%s must be %s (found %s)\n", config_key, expected[config_key], actual[config_key]
      has_errors = 1
    }
  }
  exit has_errors
}
')"
validation_status=$?

if [ "$validation_status" -eq 0 ]; then
  exit 0
fi

echo "Supabase local configuration must use the standard avandar identity and ports:" >&2
printf '%s\n' "$validation_output" >&2
echo "Run 'ava supabase restore', stage the restored files, and retry." >&2
exit 1
