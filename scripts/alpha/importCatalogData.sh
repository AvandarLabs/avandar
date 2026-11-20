#!/bin/bash
#-------------------------------------------------------------------------------
# Loads a catalog dump written by exportCatalogData.sh into a target
# database, in one transaction that stops on the first error. Used to move
# the catalog built on demo-measles into alpha-dev and production.
#
# Usage:
#   bash scripts/alpha/importCatalogData.sh <target-db-url> <dump.sql> \
#     [--yes-i-know-the-target <user@host>]
#
# <target-db-url> is the target's `postgres` connection string, in URL form
# (postgresql://<user>:<password>@<host>:<port>/postgres). The `postgres`
# role owns the catalog tables, so it can load them.
#
# Before it writes anything, the script:
#   - refuses a missing or empty dump, and a dump that holds anything but
#     `COPY` rows for the tables in catalogTables.sh;
#   - prints the target's user, host, and database (never the password), and
#     the rows the dump holds per table;
#   - refuses a target whose catalog tables already hold any row;
#   - asks you to type the target's `<user>@<host>`, or takes it from
#     `--yes-i-know-the-target`, and refuses on any mismatch. The user is part
#     of it because a Supabase pooler host is shared by every project, and
#     only the pooler user (`postgres.<project-ref>`) names the project.
# After the import, it prints each table's row count in the target.
#
# PSQL_BIN overrides the psql binary.
#-------------------------------------------------------------------------------
set -euo pipefail

CONFIRM_FLAG="--yes-i-know-the-target"
USAGE="Usage: importCatalogData.sh <target-db-url> <dump.sql> [$CONFIRM_FLAG <user@host>]"
PSQL_BIN="${PSQL_BIN:-psql}"

# shellcheck source=scripts/alpha/catalogTables.sh
source "$(dirname "${BASH_SOURCE[0]}")/catalogTables.sh"

fail() {
  echo "Refusing to import: $*" >&2
  exit 1
}

# Prints one part of a postgres:// URL: user, host, or database. Never
# prints the password.
url_part() {
  local rest="${2#*://}"
  local credentials="${rest%@*}"
  local location="${rest##*@}"
  case "$1" in
    user) echo "${credentials%%:*}" ;;
    host) location="${location%%[/?]*}" && echo "${location%%:*}" ;;
    database)
      [[ "$location" == */* ]] || return 0
      location="${location#*/}" && echo "${location%%\?*}"
      ;;
  esac
}

# Prints the row count of one table in the target.
target_row_count() {
  "$PSQL_BIN" "$TARGET_DB_URL" -X -t -A -v ON_ERROR_STOP=1 \
    -c "select count(*) from $1"
}

check_dump() {
  [[ -s "$DUMP_FILE" ]] || fail "$DUMP_FILE is missing or empty."
  local unexpected_lines
  unexpected_lines="$(print_unexpected_dump_lines "$DUMP_FILE")"
  if [[ -n "$unexpected_lines" ]]; then
    echo "$unexpected_lines" >&2
    fail "$DUMP_FILE holds more than catalog rows (lines above)."
  fi
  local table
  for table in "${CATALOG_TABLES[@]}"; do
    dump_has_table "$DUMP_FILE" "$table" || fail "$DUMP_FILE has no rows block for $table."
  done
}

check_target_is_empty() {
  local table rows
  for table in "${CATALOG_TABLES[@]}"; do
    rows="$(target_row_count "$table")"
    [[ "$rows" == "0" ]] || fail "$table already has rows ($rows) in the target."
  done
}

confirm_target() {
  local typed_id
  if [[ -n "${CONFIRMED_ID+set}" ]]; then
    [[ "$CONFIRMED_ID" == "$TARGET_ID" ]] || fail "$CONFIRM_FLAG names $CONFIRMED_ID, but the target is $TARGET_ID."
    return 0
  fi
  [[ -t 0 ]] || fail "no terminal to confirm on. Pass $CONFIRM_FLAG $TARGET_ID."
  read -r -p "Type the target ($TARGET_ID) to import into it: " typed_id </dev/tty
  [[ "$typed_id" == "$TARGET_ID" ]] || fail "you typed '$typed_id', but the target is $TARGET_ID."
}

positional=()
while (($#)); do
  case "$1" in
    "$CONFIRM_FLAG")
      [[ $# -ge 2 ]] || fail "$CONFIRM_FLAG needs the target's <user@host>."
      CONFIRMED_ID="$2"
      shift 2
      ;;
    --*) fail "unknown option $1. $USAGE" ;;
    *) positional+=("$1") && shift ;;
  esac
done
[[ ${#positional[@]} -eq 2 ]] || fail "$USAGE"
TARGET_DB_URL="${positional[0]}"
DUMP_FILE="${positional[1]}"
[[ "$TARGET_DB_URL" =~ ^postgres(ql)?:// ]] || fail "the target must be a postgres:// URL."

TARGET_ID="$(url_part user "$TARGET_DB_URL")@$(url_part host "$TARGET_DB_URL")"
check_dump

echo "Target: $TARGET_ID, database $(url_part database "$TARGET_DB_URL")"
echo "The dump holds, per table:"
for table in "${CATALOG_TABLES[@]}"; do
  echo "  $table: $(count_dump_rows "$DUMP_FILE" "$table")"
done

confirm_target
check_target_is_empty

"$PSQL_BIN" "$TARGET_DB_URL" -X --single-transaction --set ON_ERROR_STOP=1 \
  --file "$DUMP_FILE"

echo "After the import, the target holds, per table:"
for table in "${CATALOG_TABLES[@]}"; do
  echo "  $table: $(target_row_count "$table")"
done
