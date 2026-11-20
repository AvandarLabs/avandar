#!/bin/bash
#-------------------------------------------------------------------------------
# Loads a catalog dump written by exportCatalogData.sh into a target
# database, then recounts `data_catalog_facet_counts`, all in one transaction
# that stops on the first error. Used to move the catalog built on
# demo-measles into alpha-dev and production.
#
# Usage:
#   bash scripts/alpha/importCatalogData.sh <target-db-url> <dump.sql> \
#     [--dry-run] [--yes-i-know-the-target <user@host>] \
#     [--replace-existing --backup-file <backup.sql> \
#      [--yes-i-know-the-cascade <rows>]]
#
# <target-db-url> is the target's `postgres` connection string, in URL form
# (postgresql://<user>:<password>@<host>:<port>/postgres). The `postgres`
# role owns the catalog tables and the facet count refresh function.
#
# Before it writes anything, the script:
#   - refuses a missing or empty dump, and a dump that holds anything but
#     `COPY` rows for the tables in catalogTables.sh;
#   - prints the target's user, host, and database (never the password), the
#     rows the dump holds, and a read-only report of the target: its row
#     counts, the listing ids the dump would drop, and every foreign key
#     outside the catalog that a delete of the catalog would reach;
#   - asks you to type the target's `<user>@<host>`, or takes it from
#     `--yes-i-know-the-target`, and refuses on any mismatch. The user is part
#     of it because a Supabase pooler host is shared by every project, and
#     only the pooler user (`postgres.<project-ref>`) names the project.
#
# By default it refuses a target whose catalog tables hold any row. With
# `--replace-existing` it deletes them first, children first, in the same
# transaction as the load, so a failed load restores them. That delete
# cascades to every dependent row the report lists, so it also:
#   - refuses when a restricting foreign key has rows that would block it;
#   - needs `--backup-file`, a pg_dump data-only dump made in the last 24
#     hours of the catalog, the facet counts, and every dependent table (the
#     refusal prints the command that makes one);
#   - asks you to type `delete <N> dependent rows`, or takes N from
#     `--yes-i-know-the-cascade`.
#
# `--dry-run` prints the report and the plan, then exits 0 without writing.
# Row counts are printed before and after the import.
#
# PSQL_BIN overrides the psql binary.
#-------------------------------------------------------------------------------
set -euo pipefail

TARGET_FLAG="--yes-i-know-the-target"
CASCADE_FLAG="--yes-i-know-the-cascade"
USAGE="Usage: importCatalogData.sh <target-db-url> <dump.sql> [--dry-run] [$TARGET_FLAG <user@host>] [--replace-existing --backup-file <backup.sql> [$CASCADE_FLAG <rows>]]"
PSQL_BIN="${PSQL_BIN:-psql}"
FIELD_SEPARATOR=$'\x1f'
# How many missing listing ids the report prints before summarizing.
MAX_LISTED_IDS=50

# shellcheck source=scripts/alpha/catalogTables.sh
source "$(dirname "${BASH_SOURCE[0]}")/catalogTables.sh"

IS_DRY_RUN=false
IS_REPLACE=false
BACKUP_FILE=""
WORK_DIR=""
DEPENDENT_TABLES=()
DEPENDENT_ROW_COUNT=0
BLOCKING_DEPENDENTS=""
TARGET_HAS_ROWS=false

fail() {
  echo "Refusing to import: $*" >&2
  exit 1
}

cleanup() {
  if [[ -n "$WORK_DIR" ]]; then
    rm -rf "$WORK_DIR"
  fi
}
trap cleanup EXIT

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

# Runs one query in a read-only session and prints its rows, unaligned,
# with fields separated by FIELD_SEPARATOR.
read_target() {
  "$PSQL_BIN" "$TARGET_DB_URL" -X -q -t -A -F "$FIELD_SEPARATOR" \
    -v ON_ERROR_STOP=1 -c "set default_transaction_read_only = on" -c "$1"
}

target_row_count() {
  read_target "select count(*) from $1"
}

parse_args() {
  local positional=()
  while (($#)); do
    case "$1" in
      "$TARGET_FLAG" | "$CASCADE_FLAG" | --backup-file)
        [[ $# -ge 2 ]] || fail "$1 needs a value. $USAGE"
        case "$1" in
          "$TARGET_FLAG") CONFIRMED_TARGET="$2" ;;
          "$CASCADE_FLAG") CONFIRMED_CASCADE="$2" ;;
          --backup-file) BACKUP_FILE="$2" ;;
        esac
        shift 2
        ;;
      --replace-existing) IS_REPLACE=true && shift ;;
      --dry-run) IS_DRY_RUN=true && shift ;;
      --*) fail "unknown option $1. $USAGE" ;;
      *) positional+=("$1") && shift ;;
    esac
  done
  [[ ${#positional[@]} -eq 2 ]] || fail "$USAGE"
  TARGET_DB_URL="${positional[0]}"
  DUMP_FILE="${positional[1]}"
}

check_dump() {
  [[ -s "$DUMP_FILE" ]] || fail "$DUMP_FILE is missing or empty."
  [[ "$DUMP_FILE" != *"'"* ]] || fail "the dump's path must not contain a quote."
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

# Every foreign key outside the catalog that a delete of every catalog row
# reaches, following `on delete cascade` down to 10 levels. Each row is the
# depth, the referencing table and columns, the referenced table, the
# `confdeltype` action, and a query for the rows the delete reaches there.
dependents_query() {
  local table quoted_tables=""
  for table in "${CATALOG_TABLES[@]}"; do
    quoted_tables+="${quoted_tables:+, }'$table'"
  done
  local catalog_array="array[$quoted_tables]"
  cat <<SQL
with recursive fk as (
  select
    format('%I.%I', child_ns.nspname, child.relname) as child,
    format('%I.%I', parent_ns.nspname, parent.relname) as parent,
    con.confdeltype as action,
    (select string_agg(format('%I', att.attname), ', ' order by key.ord)
      from unnest(con.conkey) with ordinality as key (attnum, ord)
      join pg_attribute att on att.attrelid = con.conrelid and att.attnum = key.attnum
    ) as child_columns,
    (select string_agg(format('%I', att.attname), ', ' order by key.ord)
      from unnest(con.confkey) with ordinality as key (attnum, ord)
      join pg_attribute att on att.attrelid = con.confrelid and att.attnum = key.attnum
    ) as parent_columns
  from pg_constraint con
  join pg_class child on child.oid = con.conrelid
  join pg_namespace child_ns on child_ns.oid = child.relnamespace
  join pg_class parent on parent.oid = con.confrelid
  join pg_namespace parent_ns on parent_ns.oid = parent.relnamespace
  where con.contype = 'f' and con.conparentid = 0
),
chain as (
  select 1 as depth, fk.child, fk.child_columns, fk.parent, fk.action,
    array[fk.parent, fk.child] as path,
    format('select * from %s where (%s) in (select %s from %s)',
      fk.child, fk.child_columns, fk.parent_columns, fk.parent) as affected_sql
  from fk
  where fk.parent = any ($catalog_array) and fk.child <> all ($catalog_array)
  union all
  select chain.depth + 1, fk.child, fk.child_columns, fk.parent, fk.action,
    chain.path || fk.child,
    format('select * from %s where (%s) in (select %s from (%s) as parent_rows)',
      fk.child, fk.child_columns, fk.parent_columns, chain.affected_sql)
  from chain
  join fk on fk.parent = chain.child
  where chain.action = 'c' and fk.child <> all (chain.path)
    and fk.child <> all ($catalog_array) and chain.depth < 10
)
select depth, child, child_columns, parent, action, affected_sql
from chain order by depth, child, child_columns
SQL
}

action_label() {
  case "$1" in
    c) echo "on delete cascade" ;;
    n) echo "on delete set null" ;;
    d) echo "on delete set default" ;;
    r) echo "on delete restrict" ;;
    *) echo "on delete no action" ;;
  esac
}

# Records one dependent foreign key: its rows join the cascade total, its
# table joins the backup list, and rows it would block become a blocker.
record_dependent() {
  local depth="$1" child="$2" columns="$3" parent="$4" action="$5" rows="$6"
  local line
  line="  $child.($columns) -> $parent: $(action_label "$action")"
  case "$action" in
    c | n | d)
      local effect="deleted"
      [[ "$action" == c ]] || effect="set to $([[ "$action" == n ]] && echo null || echo default)"
      echo "$line, $rows rows $effect (depth $depth)"
      DEPENDENT_ROW_COUNT=$((DEPENDENT_ROW_COUNT + rows))
      [[ " ${DEPENDENT_TABLES[*]:-} " == *" $child "* ]] || DEPENDENT_TABLES+=("$child")
      ;;
    *)
      echo "$line, $rows rows would block the delete (depth $depth)"
      if [[ "$rows" != "0" ]]; then
        BLOCKING_DEPENDENTS+="$line: $rows rows"$'\n'
      fi
      ;;
  esac
}

report_dependents() {
  local rows depth child columns parent action affected_sql
  rows="$(read_target "$(dependents_query)")"
  echo "Foreign keys outside the catalog that deleting the catalog reaches:"
  if [[ -z "$rows" ]]; then
    echo "  none"
    return 0
  fi
  while IFS="$FIELD_SEPARATOR" read -r -u 3 depth child columns parent action affected_sql; do
    record_dependent "$depth" "$child" "$columns" "$parent" "$action" \
      "$(read_target "select count(*) from ($affected_sql) as affected")"
  done 3<<<"$rows"
  echo "  The delete reaches $DEPENDENT_ROW_COUNT dependent rows, even for listings the dump brings back under the same id."
}

report_missing_listing_ids() {
  local target_ids missing_ids missing_count
  target_ids="$(read_target "select id from public.data_catalog_listings order by id")"
  missing_ids="$(LC_ALL=C comm -23 <(printf '%s\n' "$target_ids" | sed '/^$/d' | LC_ALL=C sort) \
    <(print_dump_listing_ids "$DUMP_FILE" | LC_ALL=C sort))"
  missing_count="$(printf '%s' "$missing_ids" | grep -c . || true)"
  if [[ "$missing_count" == "0" ]]; then
    echo "Every listing id in the target is in the dump."
    return 0
  fi
  echo "$missing_count listing ids in the target are not in the dump, so a replace drops them:"
  printf '%s\n' "$missing_ids" | head -n "$MAX_LISTED_IDS" | sed 's/^/  /'
  if ((missing_count > MAX_LISTED_IDS)); then
    echo "  ...and $((missing_count - MAX_LISTED_IDS)) more."
  fi
}

# Prints the row counts of the catalog, the facet counts, and every dependent
# table, under a heading.
print_target_counts() {
  local table rows
  echo "$1"
  for table in "${CATALOG_TABLES[@]}" "$FACET_COUNTS_TABLE" ${DEPENDENT_TABLES[@]+"${DEPENDENT_TABLES[@]}"}; do
    rows="$(target_row_count "$table")"
    echo "  $table: $rows"
    if [[ " ${CATALOG_TABLES[*]} " == *" $table "* && "$rows" != "0" ]]; then
      TARGET_HAS_ROWS=true
    fi
  done
}

report() {
  local table
  echo "Target: $TARGET_ID, database $(url_part database "$TARGET_DB_URL")"
  echo "The dump holds, per table:"
  for table in "${CATALOG_TABLES[@]}"; do
    echo "  $table: $(count_dump_rows "$DUMP_FILE" "$table")"
  done
  report_dependents
  print_target_counts "The target holds, per table:"
  report_missing_listing_ids
}

backup_tables() {
  printf '%s\n' "${CATALOG_TABLES[@]}" "$FACET_COUNTS_TABLE" ${DEPENDENT_TABLES[@]+"${DEPENDENT_TABLES[@]}"}
}

fail_backup() {
  echo "Make the backup with (a pg_dump at least as new as the target's server):" >&2
  # shellcheck disable=SC2016 # The variable is for the reader to fill in.
  printf '  pg_dump "$TARGET_DB_URL" --data-only --no-owner --no-privileges %s--file catalog-backup.sql\n' \
    "$(backup_tables | sed 's/^/--table /' | tr '\n' ' ')" >&2
  fail "$1"
}

check_backup() {
  [[ -n "$BACKUP_FILE" ]] || fail_backup "--replace-existing needs --backup-file <backup.sql>."
  [[ -s "$BACKUP_FILE" ]] || fail_backup "$BACKUP_FILE is missing or empty."
  [[ -n "$(find "$BACKUP_FILE" -mmin -1440)" ]] || fail_backup "$BACKUP_FILE is older than 24 hours."
  awk 'NR <= 5 && /PostgreSQL database dump/ { found = 1 } END { exit !found }' "$BACKUP_FILE" ||
    fail_backup "$BACKUP_FILE is not a pg_dump dump."
  ! grep -q '^CREATE ' "$BACKUP_FILE" || fail_backup "$BACKUP_FILE is not a data-only dump."
  local table
  while read -r table; do
    dump_has_table "$BACKUP_FILE" "$table" || fail_backup "$BACKUP_FILE has no rows block for $table."
  done < <(backup_tables)
}

# Takes a confirmation from its flag, or from a typed answer on a terminal.
# Usage: confirm <flag> <flag value or empty> <expected flag value> <phrase>
confirm() {
  local flag="$1" flag_value="$2" expected="$3" phrase="$4" typed
  if [[ -n "$flag_value" ]]; then
    [[ "$flag_value" == "$expected" ]] || fail "$flag says $flag_value, but it must be $expected."
    return 0
  fi
  [[ -t 0 ]] || fail "no terminal to confirm on. Pass $flag $expected."
  read -r -p "Type '$phrase' to continue: " typed </dev/tty
  [[ "$typed" == "$phrase" ]] || fail "you typed '$typed', not '$phrase'."
}

write_import_wrapper() {
  local dump_path table
  dump_path="$(cd "$(dirname "$DUMP_FILE")" && pwd)/$(basename "$DUMP_FILE")"
  {
    echo '\set ON_ERROR_STOP on'
    if [[ "$IS_REPLACE" == true ]]; then
      while read -r table; do
        echo "delete from $table;"
      done < <(catalog_tables_children_first)
    fi
    echo "\\i '$dump_path'"
    echo "select public.data_catalog_facet_counts__refresh();"
  } >"$1"
}

print_plan() {
  echo "Plan, in one transaction that rolls back on any error:"
  if [[ "$IS_REPLACE" == true ]]; then
    echo "  1. Delete every catalog row, children first, cascading to $DEPENDENT_ROW_COUNT dependent rows."
  fi
  echo "  $([[ "$IS_REPLACE" == true ]] && echo 2 || echo 1). Load $DUMP_FILE."
  echo "  $([[ "$IS_REPLACE" == true ]] && echo 3 || echo 2). Recount $FACET_COUNTS_TABLE."
}

# Prints why the import must stop before writing, or nothing.
plan_refusal() {
  if [[ "$IS_REPLACE" == true && -n "$BLOCKING_DEPENDENTS" ]]; then
    printf 'foreign keys with no action or restrict would block the delete:\n%s' "$BLOCKING_DEPENDENTS"
  elif [[ "$IS_REPLACE" != true && "$TARGET_HAS_ROWS" == true ]]; then
    echo "the target's catalog already has rows. Check --dry-run --replace-existing first."
  fi
}

run_import() {
  WORK_DIR="$(mktemp -d)"
  local wrapper="$WORK_DIR/import.sql"
  write_import_wrapper "$wrapper"
  "$PSQL_BIN" "$TARGET_DB_URL" -X --single-transaction --set ON_ERROR_STOP=1 \
    --file "$wrapper"
  print_target_counts "After the import, the target holds, per table:"
}

main() {
  parse_args "$@"
  [[ "$TARGET_DB_URL" =~ ^postgres(ql)?:// ]] || fail "the target must be a postgres:// URL."
  TARGET_ID="$(url_part user "$TARGET_DB_URL")@$(url_part host "$TARGET_DB_URL")"
  if [[ -n "${CONFIRMED_TARGET:-}" && "$CONFIRMED_TARGET" != "$TARGET_ID" ]]; then
    fail "$TARGET_FLAG says $CONFIRMED_TARGET, but the target is $TARGET_ID."
  fi
  check_dump
  report
  local refusal
  refusal="$(plan_refusal)"
  if [[ "$IS_DRY_RUN" == true ]]; then
    print_plan
    echo "Dry run: nothing was written.${refusal:+ The import would refuse: $refusal}"
    exit 0
  fi
  [[ -z "$refusal" ]] || fail "$refusal"
  if [[ "$IS_REPLACE" == true ]]; then
    check_backup
  fi
  print_plan
  confirm "$TARGET_FLAG" "${CONFIRMED_TARGET:-}" "$TARGET_ID" "$TARGET_ID"
  if [[ "$IS_REPLACE" == true ]]; then
    confirm "$CASCADE_FLAG" "${CONFIRMED_CASCADE:-}" "$DEPENDENT_ROW_COUNT" \
      "delete $DEPENDENT_ROW_COUNT dependent rows"
  fi
  run_import
}

main "$@"
