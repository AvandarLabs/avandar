#!/bin/bash
#-------------------------------------------------------------------------------
# Dumps the open data catalog tables, data only, from a source database to a
# file. Used to move the catalog built on demo-measles into alpha-dev and
# production without re-running every pipeline. Only reads the source.
#
# Usage:
#   bash scripts/alpha/exportCatalogData.sh <source-db-url> <out-file.sql>
#
# The table list lives in catalogTables.sh, shared with importCatalogData.sh.
# Refuses to overwrite an existing file. Prints each table's row count from
# the finished dump, and fails if the dump holds anything but catalog rows.
#
# The dump does not use `--disable-triggers`: on Supabase the `postgres` role
# is not a superuser, so the `ALTER TABLE ... DISABLE TRIGGER ALL` it writes
# fails on the foreign key triggers. It is not needed either: pg_dump writes
# parents before children, and the catalog's own triggers fire on update only.
#
# PG_DUMP_BIN overrides the pg_dump binary. Its major version must be at
# least the source server's.
#-------------------------------------------------------------------------------
set -euo pipefail

USAGE="Usage: exportCatalogData.sh <source-db-url> <out-file.sql>"
SOURCE_DB_URL="${1:?$USAGE}"
OUT_FILE="${2:?$USAGE}"
PG_DUMP_BIN="${PG_DUMP_BIN:-pg_dump}"

# shellcheck source=scripts/alpha/catalogTables.sh
source "$(dirname "${BASH_SOURCE[0]}")/catalogTables.sh"

if [[ -e "$OUT_FILE" ]]; then
  echo "Refusing to overwrite $OUT_FILE. Move it away or pick another name." >&2
  exit 1
fi

# pg_dump writes to a temp file beside the output, which only becomes the
# output once it validates. The trap deletes whatever is left of it.
TEMP_FILE="$(mktemp "$OUT_FILE.XXXXXX")"
trap 'rm -f "$TEMP_FILE" "$TEMP_FILE.stripped"' EXIT

table_args=()
for table in "${CATALOG_TABLES[@]}"; do
  table_args+=(--table "$table")
done

"$PG_DUMP_BIN" "$SOURCE_DB_URL" --data-only --no-owner --no-privileges \
  "${table_args[@]}" --file "$TEMP_FILE"

# pg_dump 17 and later write `SET transaction_timeout = 0;`, which Postgres
# before 17 rejects, and the import stops on the first error. The setting
# only turns a timeout off, so the dump loads the same without it.
grep -v -x 'SET transaction_timeout = 0;' "$TEMP_FILE" >"$TEMP_FILE.stripped" ||
  [[ $? -eq 1 ]]
mv "$TEMP_FILE.stripped" "$TEMP_FILE"

unexpected_lines="$(print_unexpected_dump_lines "$TEMP_FILE")"
if [[ -n "$unexpected_lines" ]]; then
  echo "The dump holds more than catalog rows:" >&2
  echo "$unexpected_lines" >&2
  echo "Deleted the rejected dump. $OUT_FILE was not written." >&2
  exit 1
fi

mv "$TEMP_FILE" "$OUT_FILE"
echo "Wrote $OUT_FILE. Rows per table:"
for table in "${CATALOG_TABLES[@]}"; do
  echo "  $table: $(count_dump_rows "$OUT_FILE" "$table")"
done
