#!/bin/bash
#-------------------------------------------------------------------------------
# Loads a catalog dump written by exportCatalogData.sh into a target
# database, then recounts `data_catalog_facet_counts`, all in one explicit
# `begin` ... `commit` transaction that stops on the first error. Used to
# move the catalog built on demo-measles into alpha-dev and production.
#
# Usage:
#   bash scripts/alpha/importCatalogData.sh <target-db-url> <dump.sql> \
#     [--dry-run] [--yes-i-know-the-target <user@host>] \
#     [--replace-existing --backup-file <backup.sql> \
#      [--yes-i-know-the-cascade <rows>]]
#
# <target-db-url> is the target's `postgres` connection string, in URL form
# (postgresql://<user>:<password>@<host>:<port>/postgres), with no `host`,
# `hostaddr`, `service`, `dbname`, or `user` query parameter. The `postgres`
# role owns the catalog tables and the facet count refresh function.
#
# Before it writes anything, the script:
#   - refuses a psql older than 15;
#   - refuses a missing or empty dump, and a dump that holds anything but
#     `COPY` rows for the tables in catalogTables.sh, and loads a private copy
#     of the dump it checked;
#   - prints the target's user, host, and database (never the password), the
#     rows the dump holds, and a read-only report of the target: its row
#     counts, the listing ids the dump would drop, every foreign key outside
#     the catalog that a delete of the catalog would reach, and the
#     `public.datasets` rows that would be left with no open data details;
#   - asks you to type the target's `<user>@<host>`, or takes it from
#     `--yes-i-know-the-target`, and refuses on any mismatch. The user is part
#     of it because a Supabase pooler host is shared by every project, and
#     only the pooler user (`postgres.<project-ref>`) names the project.
#
# By default it refuses a target whose catalog tables hold any row. With
# `--replace-existing` it deletes them first, children first, in the same
# transaction as the load, so a failed load restores them. That delete
# deletes or changes every dependent row the report lists, so it also:
#   - refuses when a restricting foreign key has rows that would block it;
#   - needs `--backup-file`, a pg_dump data-only dump made in the last 24
#     hours of the catalog, the facet counts, and every dependent table, whose
#     row counts match the target's (the refusal prints the command that makes
#     one, and the script prints how to restore it);
#   - asks you to type `delete <N> dependent rows`, or takes N from
#     `--yes-i-know-the-cascade`, and checks N again inside the transaction.
#
# `--dry-run` prints the report and the plan, then exits 0 without writing.
# Row counts are printed before and after the import, and after a failed one
# to show the transaction rolled back.
#
# PSQL_BIN overrides the psql binary.
#-------------------------------------------------------------------------------
set -euo pipefail

TARGET_FLAG="--yes-i-know-the-target"
CASCADE_FLAG="--yes-i-know-the-cascade"
USAGE="Usage: importCatalogData.sh <target-db-url> <dump.sql> [--dry-run] [$TARGET_FLAG <user@host>] [--replace-existing --backup-file <backup.sql> [$CASCADE_FLAG <rows>]]"
PSQL_BIN="${PSQL_BIN:-psql}"
NEW_PSQL="/opt/homebrew/opt/libpq@18/bin/psql"
FIELD_SEPARATOR=$'\x1f'
OPEN_DATA_TABLE="public.datasets__open_data"
# How many missing listing ids the report prints before summarizing.
MAX_LISTED_IDS=50

# shellcheck source=scripts/alpha/catalogTables.sh
source "$(dirname "${BASH_SOURCE[0]}")/catalogTables.sh"

IS_DRY_RUN=false
IS_REPLACE=false
BACKUP_FILE=""
WORK_DIR=""
LOAD_FILE=""
DEPENDENT_TABLES=()
DEPENDENT_COUNT_QUERIES=()
DEPENDENT_ROW_COUNT=0
SET_NULL_TABLES=""
BLOCKING_DEPENDENTS=""
ORPHAN_SUMMARY=""
TARGET_HAS_ROWS=false
LAST_COUNTS=""
BEFORE_COUNTS=""

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

# Prints one part of a postgres:// URL: user, host, database, or query.
# Never prints the password.
url_part() {
  local rest="${2#*://}"
  local credentials="${rest%@*}"
  local location="${rest##*@}"
  [[ "$rest" == *@* ]] || credentials=""
  case "$1" in
    user) echo "${credentials%%:*}" ;;
    host) location="${location%%[/?]*}" && echo "${location%%:*}" ;;
    query) [[ "$location" != *\?* ]] || echo "${location#*\?}" ;;
    database)
      location="${location%%\?*}"
      [[ "$location" == */* ]] || return 0
      echo "${location#*/}"
      ;;
  esac
}

# Refuses a URL that could make libpq connect somewhere other than the
# `<user>@<host>` the confirmation names.
check_target_url() {
  [[ "$TARGET_DB_URL" =~ ^postgres(ql)?:// ]] || fail "the target must be a postgres:// URL."
  local query user host
  query="$(url_part query "$TARGET_DB_URL")"
  if [[ "&$query" =~ \&(host|hostaddr|service|dbname|user)= ]]; then
    fail "the URL's query sets ${BASH_REMATCH[1]}, which could connect somewhere else. Put it in the URL itself."
  fi
  user="$(url_part user "$TARGET_DB_URL")"
  host="$(url_part host "$TARGET_DB_URL")"
  [[ "$user" =~ ^[A-Za-z0-9._-]+$ ]] || fail "the URL must name a plain user."
  [[ "$host" =~ ^[A-Za-z0-9.-]+$ ]] ||
    fail "the URL's host must be one plain hostname or IPv4 address. IPv6 and several hosts are not supported."
  TARGET_ID="$user@$host"
}

# psql before 15 can commit a `--single-transaction` script after a
# client-side error. The import carries its own `begin` and `commit`, so it
# does not depend on that, and this check keeps an old psql out as a second
# guard.
check_psql_version() {
  local version_line major
  version_line="$("$PSQL_BIN" --version)" || fail "cannot run $PSQL_BIN."
  major="$(awk '{ for (i = 1; i <= NF; i++) if ($i ~ /^[0-9]+(\.[0-9]+)*$/) { split($i, parts, "."); print parts[1]; exit } }' <<<"$version_line")"
  if [[ -z "$major" ]] || ((major < 15)); then
    fail "psql 15 or newer is needed, found '$version_line'. Run with PSQL_BIN=$NEW_PSQL."
  fi
}

# Runs one query in a read-only transaction and prints its rows, unaligned,
# with fields separated by FIELD_SEPARATOR. One transaction per call, so it
# also stays read-only through a transaction pooler.
read_target() {
  "$PSQL_BIN" "$TARGET_DB_URL" -X -q -t -A -F "$FIELD_SEPARATOR" \
    -v ON_ERROR_STOP=1 -1 -c "set transaction read only" -c "$1"
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

# Prints a file's absolute path, refusing one psql's `\i` cannot quote.
absolute_path() {
  local path
  path="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
  [[ "$path" != *"'"* && "$path" != *\\* ]] || fail "$path contains a quote or backslash."
  echo "$path"
}

# Copies the dump into a private folder and checks the copy, so the file
# the import loads is the file it checked.
prepare_dump() {
  [[ -s "$DUMP_FILE" ]] || fail "$DUMP_FILE is missing or empty."
  WORK_DIR="$(mktemp -d)"
  LOAD_FILE="$(absolute_path "$WORK_DIR/catalog.sql")"
  cp "$DUMP_FILE" "$LOAD_FILE"
  local unexpected_lines table
  unexpected_lines="$(print_unexpected_dump_lines "$LOAD_FILE")"
  if [[ -n "$unexpected_lines" ]]; then
    echo "$unexpected_lines" >&2
    fail "$DUMP_FILE holds more than catalog rows (lines above)."
  fi
  for table in "${CATALOG_TABLES[@]}"; do
    dump_has_table "$LOAD_FILE" "$table" || fail "$DUMP_FILE has no rows block for $table."
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

# Records one dependent foreign key: its rows join the cascade total and the
# in-transaction recount, its table joins the backup list, and rows it would
# block become a blocker.
record_dependent() {
  local depth="$1" child="$2" columns="$3" parent="$4" action="$5" rows="$6" count_query="$7"
  local line
  line="  $child.($columns) -> $parent: $(action_label "$action")"
  case "$action" in
    c | n | d)
      local effect="deleted"
      if [[ "$action" != c ]]; then
        effect="set to $([[ "$action" == n ]] && echo null || echo default)"
        SET_NULL_TABLES+="$child "
      fi
      echo "$line, $rows rows $effect (depth $depth)"
      DEPENDENT_ROW_COUNT=$((DEPENDENT_ROW_COUNT + rows))
      DEPENDENT_COUNT_QUERIES+=("$count_query")
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
  local rows depth child columns parent action affected_sql count_query
  rows="$(read_target "$(dependents_query)")"
  echo "Foreign keys outside the catalog that deleting the catalog reaches:"
  if [[ -z "$rows" ]]; then
    echo "  none"
    return 0
  fi
  while IFS="$FIELD_SEPARATOR" read -r -u 3 depth child columns parent action affected_sql; do
    count_query="select count(*) from ($affected_sql) as affected"
    record_dependent "$depth" "$child" "$columns" "$parent" "$action" \
      "$(read_target "$count_query")" "$count_query"
  done 3<<<"$rows"
  echo "  The delete deletes or changes $DEPENDENT_ROW_COUNT dependent rows, even for listings the dump brings back under the same id."
}

# Says how many `public.datasets` rows the cascade on `datasets__open_data`
# leaves behind with no open data details, and in how many workspaces.
report_orphaned_datasets() {
  [[ " ${DEPENDENT_TABLES[*]:-} " == *" $OPEN_DATA_TABLE "* ]] || return 0
  local datasets workspaces
  IFS="$FIELD_SEPARATOR" read -r datasets workspaces <<<"$(read_target \
    "select count(distinct dataset_id), count(distinct workspace_id) from $OPEN_DATA_TABLE")"
  ORPHAN_SUMMARY="$datasets public.datasets rows in $workspaces workspaces"
  echo "  The cascade leaves $ORPHAN_SUMMARY with no open data details: users' catalog datasets stay listed but can no longer load."
}

report_orphans_after() {
  [[ -n "$ORPHAN_SUMMARY" ]] || return 0
  local datasets workspaces
  IFS="$FIELD_SEPARATOR" read -r datasets workspaces <<<"$(read_target \
    "select count(*), count(distinct workspace_id) from public.datasets dataset where dataset.source_type = 'open_data' and not exists (select 1 from $OPEN_DATA_TABLE open_data where open_data.dataset_id = dataset.id)")"
  echo "$datasets open data public.datasets rows in $workspaces workspaces now have no open data details."
}

report_missing_listing_ids() {
  local target_ids missing_ids missing_count
  target_ids="$(read_target "select id from public.data_catalog_listings order by id")"
  missing_ids="$(LC_ALL=C comm -23 <(printf '%s\n' "$target_ids" | sed '/^$/d' | LC_ALL=C sort) \
    <(print_dump_listing_ids "$LOAD_FILE" | LC_ALL=C sort))"
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
# table under a heading, and keeps them as `<table> <rows>` lines in
# LAST_COUNTS.
print_target_counts() {
  local table rows
  echo "$1"
  LAST_COUNTS=""
  for table in "${CATALOG_TABLES[@]}" "$FACET_COUNTS_TABLE" ${DEPENDENT_TABLES[@]+"${DEPENDENT_TABLES[@]}"}; do
    rows="$(target_row_count "$table")"
    echo "  $table: $rows"
    LAST_COUNTS+="$table $rows"$'\n'
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
    echo "  $table: $(count_dump_rows "$LOAD_FILE" "$table")"
  done
  report_dependents
  report_orphaned_datasets
  print_target_counts "The target holds, per table:"
  BEFORE_COUNTS="$LAST_COUNTS"
  report_missing_listing_ids
}

backup_tables() {
  printf '%s\n' "${CATALOG_TABLES[@]}" "$FACET_COUNTS_TABLE" ${DEPENDENT_TABLES[@]+"${DEPENDENT_TABLES[@]}"}
}

fail_backup() {
  echo "Make the backup with a pg_dump at least as new as the target's server, such as /opt/homebrew/opt/libpq@18/bin/pg_dump:" >&2
  # shellcheck disable=SC2016 # The variable is for the reader to fill in.
  printf '  pg_dump "$TARGET_DB_URL" --data-only --no-owner --no-privileges %s--file catalog-backup.sql\n' \
    "$(backup_tables | sed "s/.*/--table '&'/" | tr '\n' ' ')" >&2
  fail "$1"
}

check_backup() {
  [[ -n "$BACKUP_FILE" ]] || fail_backup "--replace-existing needs --backup-file <backup.sql>."
  [[ -s "$BACKUP_FILE" ]] || fail_backup "$BACKUP_FILE is missing or empty."
  [[ -n "$(find "$BACKUP_FILE" -mmin -1440)" ]] || fail_backup "$BACKUP_FILE is older than 24 hours."
  awk 'NR <= 5 && /PostgreSQL database dump/ { found = 1 } END { exit !found }' "$BACKUP_FILE" ||
    fail_backup "$BACKUP_FILE is not a pg_dump dump."
  ! grep -q '^CREATE ' "$BACKUP_FILE" || fail_backup "$BACKUP_FILE is not a data-only dump."
  local table expected actual
  while read -r table expected; do
    [[ -n "$table" ]] || continue
    dump_has_table "$BACKUP_FILE" "$table" || fail_backup "$BACKUP_FILE has no rows block for $table."
    actual="$(count_dump_rows "$BACKUP_FILE" "$table")"
    [[ "$actual" == "$expected" ]] ||
      fail_backup "$BACKUP_FILE holds $actual rows of $table, but the target holds $expected. Make a fresh backup."
  done <<<"$BEFORE_COUNTS"
}

print_restore_steps() {
  local backup_path table
  backup_path="$(absolute_path "$BACKUP_FILE")"
  echo "To restore the backup later:"
  echo "  1. If the target runs Postgres before 17, delete the line 'SET transaction_timeout = 0;' from $backup_path."
  echo "  2. Write restore.sql, which empties the catalog and loads the backup in one transaction:"
  echo "       begin;"
  while read -r table; do
    echo "       delete from $table;"
  done < <(catalog_tables_children_first)
  echo "       delete from $FACET_COUNTS_TABLE;"
  echo "       \\i '$backup_path'"
  echo "       commit;"
  # shellcheck disable=SC2016 # The variable is for the reader to fill in.
  echo '  3. Run it with psql 15 or newer: psql "$TARGET_DB_URL" -X -v ON_ERROR_STOP=1 --file restore.sql'
  if [[ -n "$SET_NULL_TABLES" ]]; then
    echo "  The delete only nulls rows of: $SET_NULL_TABLES. Their backup rows cannot load over them, so restore those columns by hand."
  fi
}

# Takes a confirmation from its flag, or from a typed answer on a terminal.
# Usage: confirm <flag> <flag value or empty> <expected value> <phrase> [note]
confirm() {
  local flag="$1" flag_value="$2" expected="$3" phrase="$4" note="${5:-}" typed
  if [[ -n "$flag_value" ]]; then
    [[ "$flag_value" == "$expected" ]] || fail "$flag says $flag_value, but it must be $expected."
    return 0
  fi
  [[ -t 0 ]] || fail "no terminal to confirm on. Pass $flag $expected."
  read -r -p "${note:+$note }Type '$phrase' to continue: " typed </dev/tty
  [[ "$typed" == "$phrase" ]] || fail "you typed '$typed', not '$phrase'."
}

# Writes the statements that, inside the transaction, lock the catalog and
# its dependents and raise if the delete no longer reaches exactly the rows
# that were confirmed.
write_cascade_check() {
  local tables recount
  tables="$( (catalog_tables_children_first && printf '%s\n' ${DEPENDENT_TABLES[@]+"${DEPENDENT_TABLES[@]}"}) |
    sed '/^$/d' | paste -s -d, - | sed 's/,/, /g')"
  echo "lock table $tables in share row exclusive mode;"
  recount="0"
  local query
  for query in ${DEPENDENT_COUNT_QUERIES[@]+"${DEPENDENT_COUNT_QUERIES[@]}"}; do
    recount+=" + ($query)"
  done
  echo "do \$check\$ begin"
  echo "  if ($recount) <> $DEPENDENT_ROW_COUNT then"
  echo "    raise exception 'The delete now reaches % dependent rows, not the $DEPENDENT_ROW_COUNT confirmed.', ($recount);"
  echo "  end if;"
  echo "end \$check\$;"
}

write_import_wrapper() {
  local table
  {
    echo '\set ON_ERROR_STOP on'
    echo "begin;"
    if [[ "$IS_REPLACE" == true ]]; then
      write_cascade_check
      while read -r table; do
        echo "delete from $table;"
      done < <(catalog_tables_children_first)
    fi
    echo "\\i '$LOAD_FILE'"
    echo "select public.data_catalog_facet_counts__refresh();"
    echo "commit;"
  } >"$1"
}

print_plan() {
  local step=1
  echo "Plan, in one transaction that rolls back on any error:"
  if [[ "$IS_REPLACE" == true ]]; then
    echo "  $step. Lock the catalog and its dependents, and check the delete still reaches $DEPENDENT_ROW_COUNT dependent rows."
    step=$((step + 1))
    echo "  $step. Delete every catalog row, children first, deleting or changing $DEPENDENT_ROW_COUNT dependent rows.${ORPHAN_SUMMARY:+ This leaves $ORPHAN_SUMMARY with no open data details.}"
    step=$((step + 1))
  fi
  echo "  $step. Load $DUMP_FILE."
  echo "  $((step + 1)). Recount $FACET_COUNTS_TABLE."
}

# Prints why the import must stop before writing, or nothing.
plan_refusal() {
  if [[ "$IS_REPLACE" == true && -n "$BLOCKING_DEPENDENTS" ]]; then
    printf 'foreign keys with no action or restrict would block the delete:\n%s' "$BLOCKING_DEPENDENTS"
  elif [[ "$IS_REPLACE" != true && "$TARGET_HAS_ROWS" == true ]]; then
    echo "the target's catalog already has rows. Check --dry-run --replace-existing first."
  fi
}

report_failed_import() {
  print_target_counts "After the failed import, the target holds, per table:" >&2
  if [[ "$LAST_COUNTS" == "$BEFORE_COUNTS" ]]; then
    echo "The import failed and its transaction rolled back: every count matches the report." >&2
  else
    echo "The import failed, and the counts differ from the report. Check the target now." >&2
  fi
  exit 1
}

run_import() {
  local wrapper="$WORK_DIR/import.sql"
  write_import_wrapper "$wrapper"
  # No --single-transaction: the wrapper carries its own begin and commit,
  # so a client-side error stops psql before `commit` and the server rolls
  # the whole transaction back.
  "$PSQL_BIN" "$TARGET_DB_URL" -X -q --set ON_ERROR_STOP=1 --file "$wrapper" || report_failed_import
  print_target_counts "After the import, the target holds, per table:"
  report_orphans_after
}

confirm_all() {
  confirm "$TARGET_FLAG" "${CONFIRMED_TARGET:-}" "$TARGET_ID" "$TARGET_ID"
  if [[ "$IS_REPLACE" == true ]]; then
    confirm "$CASCADE_FLAG" "${CONFIRMED_CASCADE:-}" "$DEPENDENT_ROW_COUNT" \
      "delete $DEPENDENT_ROW_COUNT dependent rows" \
      "${ORPHAN_SUMMARY:+The delete leaves $ORPHAN_SUMMARY with no open data details.}"
  fi
}

main() {
  parse_args "$@"
  check_target_url
  if [[ -n "${CONFIRMED_TARGET:-}" && "$CONFIRMED_TARGET" != "$TARGET_ID" ]]; then
    fail "$TARGET_FLAG says $CONFIRMED_TARGET, but the target is $TARGET_ID."
  fi
  prepare_dump
  check_psql_version
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
    print_restore_steps
  fi
  print_plan
  confirm_all
  run_import
}

main "$@"
