#!/bin/bash
#-------------------------------------------------------------------------------
# The pipeline server deploy scripts' shared output theme. Every message goes
# to stderr, so stdout carries only a script's documented data. Color is off
# when stderr is not a terminal, NO_COLOR is set, or TERM is dumb.
#-------------------------------------------------------------------------------

if [[ -t 2 && -z "${NO_COLOR:-}" && "${TERM:-}" != "dumb" ]]; then
  _THEME_RESET=$'\033[0m'
  _THEME_BOLD=$'\033[1m'
  _THEME_INFO=$'\033[36m'
  _THEME_SUCCESS=$'\033[32m'
  _THEME_WARNING=$'\033[33m'
  _THEME_ERROR=$'\033[31m'
else
  _THEME_RESET=""
  _THEME_BOLD=""
  _THEME_INFO=""
  _THEME_SUCCESS=""
  _THEME_WARNING=""
  _THEME_ERROR=""
fi

# Prints a heading, such as a usage section title, to stdout.
theme_heading() {
  printf '%s%s%s\n' "$_THEME_BOLD" "$1" "$_THEME_RESET"
}

# Announces a step before it starts.
theme_info() {
  printf '%s➜ %s%s\n' "$_THEME_INFO" "$1" "$_THEME_RESET" >&2
}

theme_success() {
  printf '%s✅ %s%s\n' "$_THEME_SUCCESS" "$1" "$_THEME_RESET" >&2
}

theme_warning() {
  printf '%s⚠️ %s%s\n' "$_THEME_WARNING" "$1" "$_THEME_RESET" >&2
}

# Prints an error and, on the next line, how to fix it.
# Usage: theme_error <command> <what went wrong> <how to fix it>
theme_error() {
  printf '%s❌ %s: %s%s\n' "$_THEME_ERROR" "$1" "$2" "$_THEME_RESET" >&2
  printf '%s  ⚠️ %s%s\n' "$_THEME_WARNING" "$3" "$_THEME_RESET" >&2
}
