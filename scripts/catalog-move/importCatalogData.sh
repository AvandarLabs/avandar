#!/bin/bash
#-------------------------------------------------------------------------------
# Loads a catalog dump written by exportCatalogData.sh into a target
# database, then recounts `data_catalog_facet_counts`, all in one explicit
# `begin` ... `commit` transaction that stops on the first error. Used to
# move the catalog built on demo-measles into staging and production.
#
# Usage:
#   TARGET_DB_URL=<target-db-url> \
#     bash scripts/catalog-move/importCatalogData.sh <dump.sql> \
#     [--dry-run] [--yes-i-know-the-target <user@host>] \
#     [--rewrite-storage-host <source-storage-host> <target-storage-host>] \
#     [--replace-existing --backup-file <backup.sql> \
#      [--yes-i-know-the-cascade <rows>]]
#
# The target URL comes from the TARGET_DB_URL environment variable, never an
# argument, since `ps` shows every process's arguments to every user. A
# URL passed as an argument is refused. It is the target's `postgres`
# connection string, exactly
# postgresql://<user>:<percent-encoded password>@<host>:<port>/postgres,
# optionally followed by ?sslmode=require (or verify-ca, verify-full) and
# nothing else, on the direct host or the session pooler. Port 6543, the
# transaction pooler, is refused. The `postgres` role owns the catalog tables
# and the facet count refresh function. Every PG* variable that could point
# libpq elsewhere is unset first, so the URL alone decides the target.
#
# Before it writes anything, the script:
#   - refuses a psql older than 15.14, 16.10, 17.6, or 18;
#   - refuses a missing, empty, or cut-short dump, and a dump that holds
#     anything but `COPY` rows for the tables in catalogTables.sh, and loads
#     a private copy of the dump it checked;
#   - prints the target's user and host (never the password), the rows the
#     dump holds, the Storage hosts its listings link to, and a read-only
#     report of the target: its row counts, the listing ids the dump would
#     drop, every foreign key outside the catalog that the replace would
#     reach, and each open data dataset the replace would delete, with its
#     workspace, that workspace's @avandarlabs.com members, and whether the
#     guard below passes for it;
#   - asks you to type the target's `<user>@<host>`, or takes it from
#     `--yes-i-know-the-target`, and refuses on any mismatch. The user is part
#     of it because a Supabase pooler host is shared by every project, and
#     only the pooler user (`postgres.<project-ref>`) names the project.
#
# A listing's `canonical_urls` carry the public URL of its Parquet object in
# the source project's Storage. When the dump has any, the import needs
# `--rewrite-storage-host <source> <target>`, and rewrites them to the target
# project's Storage inside the transaction, refusing to commit while any
# listing still mentions the source host.
#
# A dump's `pipeline_executions` rows carry developers' command lines
# (`cli_argv`), `<user>@<hostname>` (`actor`), and the executing machine's
# hostname (`host`). The import loads them as null, and refuses to commit
# while any loaded execution still has one. `arguments` and `request_body`
# are copied on purpose: they hold the catalog crawl's parameters, which
# say how each run built the catalog.
#
# By default it refuses a target whose catalog tables hold any row. With
# `--replace-existing` it deletes them first, children first, in the same
# transaction as the load, so a failed load restores them. Deleting every
# listing deletes every `datasets__open_data` row, even for a listing the
# dump brings back under the same id, which would leave each dataset added
# from the catalog unable to load. So the replace first deletes those
# `public.datasets` rows, and every row that cascades from them, but only
# when every member of each one's workspace has an @avandarlabs.com email:
# a workspace with no members, or with any other member, stops the whole
# transaction. Each deleted dataset fires
# `tr__datasets__log_deleted_analytics_event`, which adds one
# `usage_analytics_events` row per dataset, and restoring the backup does not
# remove those rows. That delete deletes or changes every dependent row the
# report lists, so it also:
#   - refuses when a restricting foreign key has rows that would block it;
#   - needs `--backup-file`, a pg_dump data-only dump made in the last 24
#     hours of the catalog, the facet counts, and every dependent table,
#     `public.datasets` and the tables that cascade from it among them, and
#     nothing else, whose row counts and ids match the target's (a dry run
#     and the refusal print the command that makes one, and the script
#     prints how to restore it);
#   - asks you to type `delete <N> dependent rows`, or takes N from
#     `--yes-i-know-the-cascade`, and checks N again inside the transaction.
#
# Inside the transaction, each lock waits at most 10 seconds, and every
# catalog table must hold exactly the dump's rows before `commit`. Any error
# rolls the whole transaction back. The catalog tables and the dependents
# their cascade reaches (`datasets__open_data`) stay locked until `commit`,
# for the whole load, so a user adding a catalog dataset waits, and so does
# deleting any dataset or workspace, since that delete cascades into
# `datasets__open_data`. Of the open data datasets' side, only the affected
# rows are locked: those datasets, their workspaces, those workspaces'
# memberships, and their members' `auth.users` rows, so a sign-in by one of
# those members may wait too. Other writes to datasets and workspaces, such
# as an edit or a new dataset, do not wait.
#
# `--dry-run` prints the report and the plan, then exits 0 without writing.
# Row counts are printed before and after the import, and after a failed one
# to show the transaction rolled back. That check compares only the tables
# the import locks whole, and looks up the affected open data datasets by
# id, since other datasets can change while the dump loads.
#
# Every psql the script starts gets the URL without its password, and the
# password in PGPASSWORD for that one command, so no process's arguments
# carry it: a process's environment is readable only by its own user and
# root. The commands it prints for you to run (the backup and restore)
# call `with_db_url`, the alpha cutover runbook's shell helper (1.4), which
# does the same.
#
# PSQL_BIN overrides the psql binary.
#-------------------------------------------------------------------------------
set -euo pipefail

# libpq reads these before the URL, and PGHOSTADDR or a service file can send
# psql to a host other than the one the confirmation names.
unset PGHOST PGHOSTADDR PGPORT PGDATABASE PGUSER PGPASSFILE PGSERVICE \
  PGSERVICEFILE PGSYSCONFDIR PGOPTIONS PGTARGETSESSIONATTRS PGSSLMODE \
  PGREQUIRESSL

TARGET_FLAG="--yes-i-know-the-target"
CASCADE_FLAG="--yes-i-know-the-cascade"
REWRITE_FLAG="--rewrite-storage-host"
USAGE="Usage: TARGET_DB_URL=<target-db-url> importCatalogData.sh <dump.sql> [--dry-run] [$TARGET_FLAG <user@host>] [$REWRITE_FLAG <source-host> <target-host>] [--replace-existing --backup-file <backup.sql> [$CASCADE_FLAG <rows>]]"
TARGET_URL_PATTERN='^postgres(ql)?://([A-Za-z0-9._-]+)(:[^@/?#]*)?@([A-Za-z0-9.-]+)(:([0-9]+))?/postgres(\?sslmode=(require|verify-ca|verify-full))?$'
STORAGE_HOST_PATTERN='^[A-Za-z0-9.-]+(:[0-9]+)?$'
PSQL_BIN="${PSQL_BIN:-psql}"
# The psql releases that know pg_dump 18's `\restrict`, as check_psql_version
# enforces them.
PSQL_VERSIONS="15.14+, 16.10+, 17.6+, or 18+"
NEW_PSQL="/opt/homebrew/opt/libpq@18/bin/psql"
FIELD_SEPARATOR=$'\x1f'
OPEN_DATA_TABLE="public.datasets__open_data"
DATASETS_TABLE="public.datasets"
MEMBERSHIPS_TABLE="public.workspace_memberships"
# Every member of a workspace must have an email in this domain before the
# replace deletes the workspace's open data datasets.
AVANDAR_EMAIL_DOMAIN="@avandarlabs.com"
# The ids of every dataset added from the catalog. The replace deletes every
# listing, and with it every `datasets__open_data` row, so it deletes these
# datasets first.
OPEN_DATA_DATASET_IDS_SQL="select dataset_id from $OPEN_DATA_TABLE where catalog_listing_id in (select id from public.data_catalog_listings)"
OPEN_DATA_DATASETS_SQL="select * from $DATASETS_TABLE where id in ($OPEN_DATA_DATASET_IDS_SQL)"
EXECUTIONS_TABLE="public.pipeline_executions"
# The execution columns that hold a developer's command line,
# `<user>@<hostname>`, and the executing machine's hostname, which the import
# loads as null.
REDACTED_EXECUTION_COLUMNS=(cli_argv actor host)
# The schema the printed restore steps stage the backup's rows in.
RESTORE_SCHEMA="catalog_restore"
LOCK_TIMEOUT="10s"
# How many missing listing ids the report prints before summarizing.
MAX_LISTED_IDS=50

# shellcheck source=scripts/catalog-move/catalogTables.sh
source "$(dirname "${BASH_SOURCE[0]}")/catalogTables.sh"

IS_DRY_RUN=false
IS_REPLACE=false
BACKUP_FILE=""
REWRITE_SOURCE_HOST=""
REWRITE_TARGET_HOST=""
WORK_DIR=""
LOAD_FILE=""
# The folder index_backup writes the backup's index into.
BACKUP_INDEX_DIR=""
DEPENDENT_TABLES=()
# The dependent tables the catalog's own cascade reaches, which the import
# locks whole. Tables reached only from the open data datasets are not
# locked whole: the import locks just the affected rows.
LOCKED_DEPENDENT_TABLES=()
DEPENDENT_COUNT_QUERIES=()
DEPENDENT_ROW_COUNT=0
SET_NULL_TABLES=""
BLOCKING_DEPENDENTS=""
OPEN_DATA_DATASET_SUMMARY=""
HAS_OPEN_DATA_DATASETS=false
GUARD_REFUSAL=""
# The ids of the open data datasets the report found, which the replace
# deletes.
AFFECTED_DATASET_IDS=()
DUMP_REDACTED_COLUMNS=()
TARGET_CONNECT_URL=""
TARGET_PASSWORD=""
TARGET_HAS_ROWS=false
TARGET_LISTING_IDS=""
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

# Reads the user, host, and port from the whole URL with one anchored
# pattern, so the script and libpq cannot see different hosts in it.
check_target_url() {
  if [[ "$TARGET_DB_URL" == *connect_timeout=* ]]; then
    # shellcheck disable=SC2016 # The command is for the reader to run.
    fail 'the target URL carries connect_timeout, which `supabase branches get` adds. Strip the query first: TARGET_DB_URL="${TARGET_DB_URL%%\?*}"'
  fi
  [[ "$TARGET_DB_URL" =~ $TARGET_URL_PATTERN ]] ||
    fail "the target URL must be exactly postgresql://<user>:<percent-encoded password>@<host>:<port>/postgres, optionally with ?sslmode=require, verify-ca, or verify-full, and nothing else."
  TARGET_USER="${BASH_REMATCH[2]}"
  TARGET_HOST="${BASH_REMATCH[4]}"
  local port="${BASH_REMATCH[6]:-5432}"
  [[ "$port" != 6543 ]] ||
    fail "port 6543 is the transaction pooler, where the dump's session settings would leak onto other clients' connections. Use the direct host or the session pooler on 5432."
  TARGET_ID="$TARGET_USER@$TARGET_HOST"
  split_db_url_password "$TARGET_DB_URL" ||
    fail "cannot split the password out of the target URL, or it has an invalid percent-encoding. Percent-encode each special character in it as %XX."
  TARGET_CONNECT_URL="$DB_URL_WITHOUT_PASSWORD"
  TARGET_PASSWORD="$DB_URL_PASSWORD"
}

# Runs psql on the target URL without its password, which travels in
# PGPASSWORD for this one command, so its arguments never carry it.
target_psql() {
  if [[ -n "$TARGET_PASSWORD" ]]; then
    PGPASSWORD="$TARGET_PASSWORD" "$PSQL_BIN" "$TARGET_CONNECT_URL" "$@"
  else
    "$PSQL_BIN" "$TARGET_CONNECT_URL" "$@"
  fi
}

# The Storage host of a Supabase target, from the direct host
# (`db.<ref>.supabase.co`) or the pooler user (`postgres.<ref>`), or
# nothing when the URL does not name a project ref.
expected_storage_host() {
  if [[ "$TARGET_HOST" =~ ^db\.([a-z0-9-]+)\.supabase\.co$ ]] ||
    [[ "$TARGET_USER" =~ ^postgres\.([a-z0-9-]+)$ ]]; then
    echo "${BASH_REMATCH[1]}.supabase.co"
  fi
}

check_rewrite_hosts() {
  [[ -n "$REWRITE_SOURCE_HOST" ]] || return 0
  [[ "$REWRITE_SOURCE_HOST" =~ $STORAGE_HOST_PATTERN && "$REWRITE_TARGET_HOST" =~ $STORAGE_HOST_PATTERN ]] ||
    fail "$REWRITE_FLAG takes two plain hosts, such as <ref>.supabase.co."
  [[ "$REWRITE_SOURCE_HOST" != "$REWRITE_TARGET_HOST" ]] || fail "$REWRITE_FLAG names the same host twice."
  local expected
  expected="$(expected_storage_host)"
  if [[ -n "$expected" && "$REWRITE_TARGET_HOST" != "$expected" ]]; then
    fail "$REWRITE_FLAG rewrites to $REWRITE_TARGET_HOST, but the target's Storage is $expected."
  fi
}

# psql must know pg_dump 18's `\restrict`, which arrived in 15.14, 16.10,
# 17.6, and 18. psql before 15 can also commit a `--single-transaction`
# script after a client-side error. The import carries its own `begin` and
# `commit`, so it does not depend on that, and this check is a second guard.
check_psql_version() {
  local version_line major minor minimum
  version_line="$("$PSQL_BIN" --version)" || fail "cannot run $PSQL_BIN."
  read -r major minor <<<"$(awk '{ for (i = 1; i <= NF; i++) if ($i ~ /^[0-9]+(\.[0-9]+)*$/) { split($i, parts, "."); print parts[1], parts[2] + 0; exit } }' <<<"$version_line")"
  case "${major:-0}" in
    15) minimum=14 ;;
    16) minimum=10 ;;
    17) minimum=6 ;;
    *) minimum=0 ;;
  esac
  if ((${major:-0} < 15 || ${minor:-0} < minimum)); then
    fail "psql $PSQL_VERSIONS is needed, found '$version_line'. Run with PSQL_BIN=$NEW_PSQL."
  fi
}

# Runs one query in a read-only transaction and prints its rows, unaligned,
# with fields separated by FIELD_SEPARATOR. One transaction per call, so it
# also stays read-only through a pooler, and it waits at most LOCK_TIMEOUT
# for a lock another session holds.
read_target() {
  target_psql -X -P pager=off -q -t -A -F "$FIELD_SEPARATOR" \
    -v ON_ERROR_STOP=1 -1 -c "set transaction read only" \
    -c "set local lock_timeout = '$LOCK_TIMEOUT'" -c "$1"
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
      "$REWRITE_FLAG")
        [[ $# -ge 3 ]] || fail "$1 needs a source and a target host. $USAGE"
        REWRITE_SOURCE_HOST="$2" && REWRITE_TARGET_HOST="$3" && shift 3
        ;;
      --replace-existing) IS_REPLACE=true && shift ;;
      --dry-run) IS_DRY_RUN=true && shift ;;
      --*) fail "unknown option $1. $USAGE" ;;
      *)
        ! looks_like_db_url "$1" ||
          fail "Pass the target URL in TARGET_DB_URL, not as an argument: ps shows every argument. $USAGE"
        positional+=("$1") && shift
        ;;
    esac
  done
  [[ ${#positional[@]} -eq 1 ]] || fail "$USAGE"
  [[ -n "${TARGET_DB_URL:-}" ]] || fail "TARGET_DB_URL is not set. Export the target URL in it. $USAGE"
  DUMP_FILE="${positional[0]}"
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
  local problems table
  problems="$(print_dump_completeness_problems "$LOAD_FILE")"
  [[ -z "$problems" ]] || fail "$DUMP_FILE looks cut short: $(echo "$problems" | paste -s -d ';' -)."
  problems="$(print_unexpected_dump_lines "$LOAD_FILE")"
  if [[ -n "$problems" ]]; then
    echo "$problems" >&2
    fail "$DUMP_FILE holds more than catalog rows (lines above)."
  fi
  for table in "${CATALOG_TABLES[@]}"; do
    dump_has_table "$LOAD_FILE" "$table" || fail "$DUMP_FILE has no rows block for $table."
  done
  redact_executions
}

# Nulls the command line, actor, and host of every execution in the private
# copy of the dump, so they never reach the target. Only the columns the
# dump has.
redact_executions() {
  local header column
  header=", $(print_dump_header_columns "$LOAD_FILE" "$EXECUTIONS_TABLE"), "
  for column in "${REDACTED_EXECUTION_COLUMNS[@]}"; do
    [[ "$header" != *", $column, "* ]] || DUMP_REDACTED_COLUMNS+=("$column")
  done
  ((${#DUMP_REDACTED_COLUMNS[@]})) || return 0
  redact_dump_columns "$LOAD_FILE" "$EXECUTIONS_TABLE" "${DUMP_REDACTED_COLUMNS[@]}" >"$LOAD_FILE.redacted"
  mv "$LOAD_FILE.redacted" "$LOAD_FILE"
}

# Every foreign key outside the catalog that the replace reaches, following
# `on delete cascade` down to 10 levels, from two kinds of root: every row of
# each catalog table, and, when `datasets__open_data` exists, the open data
# datasets the replace deletes first. That second root skips
# `datasets__open_data` itself: its rows there are exactly the ones the
# listings' cascade reaches, which the first root already counts. Each row is
# the depth, the referencing table and columns, the referenced table, the
# `confdeltype` action, a query for the rows the delete reaches there, and the
# root it was reached from.
dependents_query() {
  local table quoted_tables="" catalog_roots=""
  for table in "${CATALOG_TABLES[@]}"; do
    quoted_tables+="${quoted_tables:+, }'$table'"
    catalog_roots+="${catalog_roots:+, }('$table', 'select * from $table', null)"
  done
  local catalog_array="array[$quoted_tables]"
  cat <<SQL
with recursive fk as (
$(foreign_keys_sql)
),
roots (parent, parent_rows, skipped_child) as (
  select * from (values $catalog_roots) as catalog_root (parent, parent_rows, skipped_child)
  union all
  select '$DATASETS_TABLE', '$OPEN_DATA_DATASETS_SQL', '$OPEN_DATA_TABLE'
  where to_regclass('$OPEN_DATA_TABLE') is not null
),
chain as (
  select 1 as depth, fk.child, fk.child_columns, fk.parent, fk.action,
    array[fk.parent, fk.child] as path,
    format('select * from %s where (%s) in (select %s from (%s) as parent_rows)',
      fk.child, fk.child_columns, fk.parent_columns, roots.parent_rows) as affected_sql
  from fk
  join roots on roots.parent = fk.parent
  where fk.child <> all ($catalog_array)
    and fk.child is distinct from roots.skipped_child
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
select depth, child, child_columns, parent, action, affected_sql, path[1] as root
from chain order by depth, child, child_columns
SQL
}

# Every foreign key in the database, as its referencing table and columns,
# its referenced table and columns, and its `confdeltype` action. The body of
# dependents_query's `fk` CTE.
foreign_keys_sql() {
  cat <<SQL
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
  [[ "$rows" =~ ^[0-9]+$ ]] || fail "could not count the rows $child would lose."
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
  local rows depth child columns parent action affected_sql root count_query affected_rows
  rows="$(read_target "$(dependents_query)")"
  echo "Foreign keys outside the catalog that the replace reaches, from the catalog and from the open data datasets it deletes:"
  if [[ -z "$rows" ]]; then
    echo "  none"
    return 0
  fi
  while IFS="$FIELD_SEPARATOR" read -r -u 3 depth child columns parent action affected_sql root; do
    count_query="select count(*) from ($affected_sql) as affected"
    affected_rows="$(read_target "$count_query")"
    record_dependent "$depth" "$child" "$columns" "$parent" "$action" \
      "$affected_rows" "$count_query"
    if [[ "$root" != "$DATASETS_TABLE" && " ${LOCKED_DEPENDENT_TABLES[*]:-} " != *" $child "* ]]; then
      LOCKED_DEPENDENT_TABLES+=("$child")
    fi
  done 3<<<"$rows"
  record_open_data_datasets
  echo "  The replace deletes or changes $DEPENDENT_ROW_COUNT dependent rows, even for listings the dump brings back under the same id."
}

# Prints "<datasets> public.datasets rows in <workspaces> workspaces" from a
# query that returns those two counts, or fails when the query does.
dataset_summary() {
  local result datasets workspaces
  result="$(read_target "$1")"
  IFS="$FIELD_SEPARATOR" read -r datasets workspaces <<<"$result"
  [[ "$datasets" =~ ^[0-9]+$ && "$workspaces" =~ ^[0-9]+$ ]] ||
    fail "could not count the datasets added from the catalog."
  echo "$datasets public.datasets rows in $workspaces workspaces"
}

# Records the open data datasets the replace deletes before the catalog as a
# dependent: their rows join the cascade total, the in-transaction recount,
# and the backup. Only when the listings' cascade reaches
# `datasets__open_data`.
record_open_data_datasets() {
  [[ " ${DEPENDENT_TABLES[*]:-} " == *" $OPEN_DATA_TABLE "* ]] || return 0
  local summary datasets workspaces
  summary="$(dataset_summary "select count(distinct dataset.id), count(distinct dataset.workspace_id) from ($OPEN_DATA_DATASETS_SQL) as dataset")"
  read -r datasets _ _ _ workspaces _ <<<"$summary"
  HAS_OPEN_DATA_DATASETS=true
  OPEN_DATA_DATASET_SUMMARY="$summary"
  echo "  $DATASETS_TABLE: $datasets rows deleted, every dataset added from the catalog, in $workspaces workspaces"
  DEPENDENT_ROW_COUNT=$((DEPENDENT_ROW_COUNT + datasets))
  DEPENDENT_COUNT_QUERIES+=("select count(*) from ($OPEN_DATA_DATASETS_SQL) as affected")
  DEPENDENT_TABLES+=("$DATASETS_TABLE")
}

# One row per open data dataset the replace deletes: its id and name, its
# workspace's id and name, how many members the workspace has, how many of
# them have no @avandarlabs.com email (a member with no email among them),
# and the @avandarlabs.com emails. It never selects any other email.
open_data_datasets_query() {
  cat <<SQL
select dataset.id, translate(dataset.name, E'\n\r\t\x1f', '    '),
  dataset.workspace_id, translate(workspace.name, E'\n\r\t\x1f', '    '),
  count(membership.id) as member_count,
  count(membership.id) filter (
    where lower(coalesce(member.email, '')) not like '%$AVANDAR_EMAIL_DOMAIN'
  ) as other_member_count,
  coalesce(string_agg(member.email, ', ' order by member.email) filter (
    where lower(member.email) like '%$AVANDAR_EMAIL_DOMAIN'
  ), '') as avandar_emails
from ($OPEN_DATA_DATASETS_SQL) as dataset
join public.workspaces workspace on workspace.id = dataset.workspace_id
left join $MEMBERSHIPS_TABLE membership on membership.workspace_id = dataset.workspace_id
left join auth.users member on member.id = membership.user_id
group by dataset.id, dataset.name, dataset.workspace_id, workspace.name
order by workspace.name, dataset.id
SQL
}

# Prints why the guard stops the delete of one open data dataset, or
# nothing when every member of its workspace has an @avandarlabs.com email.
#
# Usage: guard_failure <dataset id> <workspace id> <members> <other members>
guard_failure() {
  if (($3 == 0)); then
    echo "open data dataset $1 in workspace $2 has no members."
  elif (($4 > 0)); then
    echo "open data dataset $1 in workspace $2 has $4 of its $3 members without an $AVANDAR_EMAIL_DOMAIN email."
  fi
}

# Prints each open data dataset the replace deletes, its workspace, the
# workspace's @avandarlabs.com members, and whether the guard passes for it,
# and keeps the first failure in GUARD_REFUSAL.
report_open_data_datasets() {
  [[ "$HAS_OPEN_DATA_DATASETS" == true ]] || return 0
  local rows dataset_id dataset_name workspace_id workspace_name members others emails failure verdict count=0
  rows="$(read_target "$(open_data_datasets_query)")"
  echo "Open data datasets the replace deletes, with their workspaces' members:"
  while IFS="$FIELD_SEPARATOR" read -r -u 3 dataset_id dataset_name workspace_id workspace_name members others emails; do
    [[ -n "$dataset_id" ]] || continue
    [[ "$members" =~ ^[0-9]+$ && "$others" =~ ^[0-9]+$ ]] || fail "could not read the members of workspace $workspace_id."
    count=$((count + 1))
    [[ "$dataset_id" =~ ^[A-Za-z0-9-]+$ ]] || fail "could not read the id of open data dataset $count."
    AFFECTED_DATASET_IDS+=("$dataset_id")
    failure="$(guard_failure "$dataset_id" "$workspace_id" "$members" "$others")"
    verdict="passes"
    if [[ -n "$failure" ]]; then
      verdict="fails"
      [[ -n "$GUARD_REFUSAL" ]] || GUARD_REFUSAL="$failure"
    fi
    echo "  dataset $dataset_id \"$dataset_name\" in workspace $workspace_id \"$workspace_name\""
    echo "    members: ${emails:-none with an $AVANDAR_EMAIL_DOMAIN email} ($((members - others)) of $members have an $AVANDAR_EMAIL_DOMAIN email), guard $verdict"
  done 3<<<"$rows"
  if [[ -n "$GUARD_REFUSAL" ]]; then
    echo "  The $AVANDAR_EMAIL_DOMAIN guard fails: $GUARD_REFUSAL"
  else
    echo "  The $AVANDAR_EMAIL_DOMAIN guard passes for all $count open data datasets."
  fi
}

report_orphans_after() {
  [[ "$HAS_OPEN_DATA_DATASETS" == true ]] || return 0
  local summary
  summary="$(dataset_summary "select count(*), count(distinct workspace_id) from public.datasets dataset where dataset.source_type = 'open_data' and not exists (select 1 from $OPEN_DATA_TABLE open_data where open_data.dataset_id = dataset.id)")"
  echo "Open data datasets with no open data details now: $summary."
}

report_missing_listing_ids() {
  local missing_ids missing_count
  TARGET_LISTING_IDS="$(read_target "select id::text from public.data_catalog_listings order by 1")"
  missing_ids="$(LC_ALL=C comm -23 <(printf '%s\n' "$TARGET_LISTING_IDS" | sed '/^$/d' | LC_ALL=C sort) \
    <(print_dump_column "$LOAD_FILE" public.data_catalog_listings id | LC_ALL=C sort))"
  missing_count="$(printf '%s' "$missing_ids" | grep -c . || true)"
  if [[ "$missing_count" == "0" ]]; then
    echo "Every listing id in the target is in the dump."
    return 0
  fi
  echo "$missing_count listing ids in the target are not in the dump, so a replace drops them:"
  # sed reads every line, where `head` would exit early and break the pipe
  # under pipefail once the ids outgrow the pipe's buffer.
  printf '%s\n' "$missing_ids" | sed -n "1,${MAX_LISTED_IDS}s/^/  /p"
  if ((missing_count > MAX_LISTED_IDS)); then
    echo "  ...and $((missing_count - MAX_LISTED_IDS)) more."
  fi
}

report_storage_hosts() {
  local hosts
  hosts="$(print_dump_storage_hosts "$LOAD_FILE")"
  echo "Listings in the dump that link to Supabase Storage, by host:"
  if [[ -z "$hosts" ]]; then
    echo "  none"
    return 0
  fi
  printf '%s\n' "$hosts" | awk '{ print "  " $1 ": " $2 " listings" }'
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
  echo "Target: $TARGET_ID, database postgres"
  echo "The dump holds, per table:"
  for table in "${CATALOG_TABLES[@]}"; do
    echo "  $table: $(count_dump_rows "$LOAD_FILE" "$table")"
  done
  report_storage_hosts
  report_dependents
  report_open_data_datasets
  print_target_counts "The target holds, per table:"
  BEFORE_COUNTS="$LAST_COUNTS"
  report_missing_listing_ids
}

backup_tables() {
  printf '%s\n' "${CATALOG_TABLES[@]}" "$FACET_COUNTS_TABLE" ${DEPENDENT_TABLES[@]+"${DEPENDENT_TABLES[@]}"}
}

# Prints the pg_dump command that makes the backup a replace needs.
print_backup_command() {
  echo "Make the backup with a pg_dump at least as new as the target's server, which PG_DUMP_BIN names (such as /opt/homebrew/opt/libpq@18/bin/pg_dump), through the cutover runbook's with_db_url helper (1.4), which keeps the password out of pg_dump's arguments:"
  # shellcheck disable=SC2016 # The variable is for the reader to fill in.
  printf '  with_db_url "$TARGET_DB_URL" "$PG_DUMP_BIN" --data-only --no-owner --no-privileges %s--file %s\n' \
    "$(backup_tables | sed "s/.*/--table '&'/" | tr '\n' ' ')" \
    "'catalog-backup-$TARGET_HOST-$(date +%Y%m%d-%H%M).sql'"
}

fail_backup() {
  print_backup_command >&2
  fail "$1"
}

# Prints the ids a target table holds and the ids the backup holds for it,
# sorted, and fails when they differ. Tables with no `id` column are skipped.
check_backup_ids() {
  local table="$1" has_id target_ids backup_ids ids_file
  has_id="$(read_target "select count(*) from pg_attribute where attrelid = '$table'::regclass and attname = 'id' and not attisdropped")"
  [[ "$has_id" == "1" ]] || return 0
  if [[ "$table" == public.data_catalog_listings ]]; then
    target_ids="$TARGET_LISTING_IDS"
  else
    target_ids="$(read_target "select id::text from $table order by 1")"
  fi
  ids_file="$(backup_index_value ids "$table")"
  backup_ids=""
  if [[ -n "$ids_file" ]]; then
    backup_ids="$(LC_ALL=C sort "$ids_file")"
  fi
  [[ "$(printf '%s\n' "$target_ids" | sed '/^$/d' | LC_ALL=C sort)" == "$(printf '%s\n' "$backup_ids" | sed '/^$/d')" ]] ||
    fail_backup "$BACKUP_FILE holds other $table ids than the target. Make a fresh backup."
}

# Reads the backup once, with index_dump, into BACKUP_INDEX_DIR in the
# private folder. The checks and the restore steps read the index, never the
# backup again, which can be over a gigabyte.
index_backup() {
  local tables=() table
  while read -r table; do
    tables+=("$table")
  done < <(backup_tables)
  BACKUP_INDEX_DIR="$WORK_DIR/backup-index"
  mkdir "$BACKUP_INDEX_DIR"
  index_dump "$BACKUP_FILE" "$BACKUP_INDEX_DIR" "${tables[@]}" >"$BACKUP_INDEX_DIR/summary"
}

# Prints the rest of the backup index's first line that starts with these
# words, such as the rows of one table for `rows <schema.table>`, or nothing.
#
# Usage: backup_index_value <word>...
backup_index_value() {
  awk -v prefix="$* " '
    index($0, prefix) == 1 { print substr($0, length(prefix) + 1); exit }
  ' "$BACKUP_INDEX_DIR/summary"
}

check_backup() {
  [[ -n "$BACKUP_FILE" ]] || fail_backup "--replace-existing needs --backup-file <backup.sql>."
  [[ -s "$BACKUP_FILE" ]] || fail_backup "$BACKUP_FILE is missing or empty."
  [[ -n "$(find "$BACKUP_FILE" -mmin -1440)" ]] || fail_backup "$BACKUP_FILE is older than 24 hours."
  index_backup
  [[ "$(backup_index_value pg_dump_header)" == 1 ]] ||
    fail_backup "$BACKUP_FILE is not a pg_dump dump."
  [[ "$(backup_index_value creates)" == 0 ]] || fail_backup "$BACKUP_FILE is not a data-only dump."
  local extra_table
  extra_table="$(backup_index_value other_table)"
  [[ -z "$extra_table" ]] || fail_backup "$BACKUP_FILE also holds $extra_table, which this import does not touch."
  local table expected actual
  while read -r table expected; do
    [[ -n "$table" ]] || continue
    actual="$(backup_index_value rows "$table")"
    [[ -n "$actual" ]] || fail_backup "$BACKUP_FILE has no rows block for $table."
    [[ "$actual" == "$expected" ]] ||
      fail_backup "$BACKUP_FILE holds $actual rows of $table, but the target holds $expected. Make a fresh backup."
    check_backup_ids "$table"
  done <<<"$BEFORE_COUNTS"
}

# Prints the backup's tables in the order a restore inserts them: the
# catalog parents first, the facet counts, the open data datasets, then the
# rows that depend on them.
restore_tables() {
  printf '%s\n' "${CATALOG_TABLES[@]}" "$FACET_COUNTS_TABLE"
  local table
  if [[ " ${DEPENDENT_TABLES[*]:-} " == *" $DATASETS_TABLE "* ]]; then
    echo "$DATASETS_TABLE"
  fi
  for table in ${DEPENDENT_TABLES[@]+"${DEPENDENT_TABLES[@]}"}; do
    [[ "$table" == "$DATASETS_TABLE" ]] || echo "$table"
  done
}

# Prints restore.sql: stage every backed-up row in RESTORE_SCHEMA, empty the
# catalog, and insert each staged row the target no longer has. A dependent
# table's rows the replace did not delete are still there, and
# `on conflict do nothing` keeps them as they are.
#
# The inserts run with `session_replication_role = replica`, which fires no
# trigger, foreign key checks included, because some backed-up tables
# reference each other: a kept original column in `dataset_columns`
# references its binding in `dataset_columns__dictionary_bindings`, which
# references the column it binds, so inserting either table first breaks a
# foreign key. Supabase lets its `postgres` role, which is not a superuser,
# set it. The deletes run before it, so their cascades still fire, and
# print_restore_foreign_key_check checks the foreign keys after it.
#
# It sets ON_ERROR_STOP itself, so a client-side error, such as a missing
# restore-rows.sql, stops psql before `commit` even when the command line
# leaves it out, and print_restore_staged_row_check refuses a staging load
# with fewer or more rows than the backup, before anything is deleted.
print_restore_sql() {
  local table columns
  echo '\set ON_ERROR_STOP on'
  echo "begin;"
  echo "set local lock_timeout = '$LOCK_TIMEOUT';"
  echo "create schema $RESTORE_SCHEMA;"
  while read -r table; do
    echo "create table $RESTORE_SCHEMA.${table#public.} (like $table);"
  done < <(restore_tables)
  echo "\\ir 'restore-rows.sql'"
  # The backup sets lock_timeout to 0 for the session, so set it again.
  echo "set local lock_timeout = '$LOCK_TIMEOUT';"
  print_restore_staged_row_check
  while read -r table; do
    echo "delete from $table;"
  done < <(catalog_tables_children_first)
  echo "delete from $FACET_COUNTS_TABLE;"
  echo "set local session_replication_role = replica;"
  while read -r table; do
    columns="$(backup_index_value header "$table")"
    echo "insert into $table ($columns) overriding system value select $columns from $RESTORE_SCHEMA.${table#public.} on conflict do nothing;"
  done < <(restore_tables)
  echo "set local session_replication_role = origin;"
  print_restore_foreign_key_check
  echo "drop schema $RESTORE_SCHEMA cascade;"
  echo "commit;"
}

# Prints the statement that raises, so the restore rolls back, unless each
# staging table holds exactly the rows the backup's index counted for its
# table. The counts are literals, so the check needs nothing but restore.sql.
print_restore_staged_row_check() {
  local table staged rows
  echo "do \$staged\$ begin"
  while read -r table; do
    staged="$RESTORE_SCHEMA.${table#public.}"
    rows="$(backup_index_value rows "$table")"
    [[ "$rows" =~ ^[0-9]+$ ]] || fail_backup "$BACKUP_FILE has no rows block for $table."
    echo "  if (select count(*) from $staged) <> $rows then"
    echo "    raise exception '$staged holds % staged rows, not the backup''s $rows.', (select count(*) from $staged);"
    echo "  end if;"
  done < <(restore_tables)
  echo "end \$staged\$;"
}

# Prints the statement that raises, so the restore rolls back, unless every
# row of the restored tables has the row each of its foreign keys
# references, since the inserts ran without the foreign key checks. A key
# with a null column references nothing, as in a `match simple` foreign key.
print_restore_foreign_key_check() {
  local tables
  tables="$(restore_tables | sed "s/.*/'&'/" | paste -s -d, - | sed 's/,/, /g')"
  cat <<SQL
do \$foreign_keys\$
declare
  foreign_key record;
  missing_keys bigint;
begin
  for foreign_key in
    select * from (
$(foreign_keys_sql)
    ) as restored_foreign_key
    where child = any (array[$tables])
  loop
    execute format(
      'select count(*) from (select %s from %s where (%s) is not null except select %s from %s) as missing',
      foreign_key.child_columns, foreign_key.child, foreign_key.child_columns,
      foreign_key.parent_columns, foreign_key.parent
    ) into missing_keys;
    if missing_keys > 0 then
      raise exception 'The restore left rows of % whose (%) match no row of %: % distinct values.', foreign_key.child, foreign_key.child_columns, foreign_key.parent, missing_keys;
    end if;
  end loop;
end \$foreign_keys\$;
SQL
}

print_restore_steps() {
  local backup_path
  backup_path="$(absolute_path "$BACKUP_FILE")"
  echo "To restore the backup later:"
  echo "  1. In an empty folder, copy the backup's rows into staging tables, without 'SET transaction_timeout = 0;', which Postgres before 17 rejects:"
  echo "       sed -E -e '/^SET transaction_timeout = 0;\$/d' -e 's/^COPY public\\./COPY $RESTORE_SCHEMA./' '$backup_path' > restore-rows.sql"
  echo "  2. Beside it, write restore.sql, which empties the catalog and puts back every backed-up row the target no longer has, in one transaction that stops on the first error and refuses staged rows that do not match the backup's counts. It inserts with triggers and foreign key checks off, since some backed-up tables reference each other, then checks every foreign key of the restored tables:"
  print_restore_sql | sed 's/^/       /'
  # shellcheck disable=SC2016 # The variable is for the reader to fill in.
  echo "  3. Run it with psql $PSQL_VERSIONS, which PSQL_BIN names:"' with_db_url "$TARGET_DB_URL" "$PSQL_BIN" -X -P pager=off -v ON_ERROR_STOP=1 --file restore.sql'
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
# the dependents its cascade reaches, lock the open data datasets' rows, and
# raise if the delete no longer reaches exactly the rows that were confirmed.
write_cascade_check() {
  local tables recount
  tables="$( (catalog_tables_children_first && printf '%s\n' ${LOCKED_DEPENDENT_TABLES[@]+"${LOCKED_DEPENDENT_TABLES[@]}"}) |
    sed '/^$/d' | paste -s -d, - | sed 's/,/, /g')"
  echo "lock table $tables in share row exclusive mode;"
  write_open_data_row_locks
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

# Writes the statements that rewrite the source Storage host in the loaded
# listings' `canonical_urls`, print how many listings changed, and raise
# while any listing still mentions the source host.
write_storage_rewrite() {
  [[ -n "$REWRITE_SOURCE_HOST" ]] || return 0
  local from="https://$REWRITE_SOURCE_HOST/storage/v1/" to="https://$REWRITE_TARGET_HOST/storage/v1/"
  cat <<SQL
with rewritten as (
  update public.data_catalog_listings listing
  set canonical_urls = array(
    select replace(item.url, '$from', '$to')
    from unnest(listing.canonical_urls) with ordinality as item (url, position)
    order by item.position
  )
  where exists (select 1 from unnest(listing.canonical_urls) as item (url) where item.url like '$from%')
  returning 1
)
select 'Rewrote the Storage URLs of ' || count(*) || ' listings.' from rewritten;
do \$storage\$ begin
  if exists (select 1 from public.data_catalog_listings listing where listing::text like '%$REWRITE_SOURCE_HOST%') then
    raise exception 'Listings still mention $REWRITE_SOURCE_HOST after the rewrite.';
  end if;
end \$storage\$;
SQL
}

# Writes the statement that locks only the rows the guard and the delete
# depend on, once `datasets__open_data` is locked so no dataset can join the
# affected set: each open data dataset, its workspace (which blocks a new
# membership there, through the foreign key), the workspace's memberships,
# and its members' `auth.users` rows (which blocks an email change). Other
# datasets and workspaces can still be edited or added while the dump loads.
write_open_data_row_locks() {
  [[ "$HAS_OPEN_DATA_DATASETS" == true ]] || return 0
  local workspaces="select workspace_id from $DATASETS_TABLE where id in ($OPEN_DATA_DATASET_IDS_SQL)"
  cat <<SQL
do \$locks\$ begin
  perform 1 from $DATASETS_TABLE where id in ($OPEN_DATA_DATASET_IDS_SQL) for update;
  perform 1 from public.workspaces where id in ($workspaces) for update;
  perform 1 from $MEMBERSHIPS_TABLE where workspace_id in ($workspaces) for update;
  perform 1 from auth.users where id in (select user_id from $MEMBERSHIPS_TABLE where workspace_id in ($workspaces)) for share;
end \$locks\$;
SQL
}

# Writes the statements that, inside the transaction, raise unless every
# member of each open data dataset's workspace has an @avandarlabs.com email
# (a workspace with no members raises too), and then delete those datasets,
# with every row that cascades from them.
write_open_data_dataset_delete() {
  [[ "$HAS_OPEN_DATA_DATASETS" == true ]] || return 0
  cat <<SQL
do \$guard\$
declare
  blocked record;
begin
  select * into blocked
  from (
$(open_data_datasets_query)
  ) as dataset_members (dataset_id, dataset_name, workspace_id, workspace_name, member_count, other_member_count, avandar_emails)
  where member_count = 0 or other_member_count > 0
  limit 1;
  if not found then
    return;
  elsif blocked.member_count = 0 then
    raise exception 'Refusing to delete open data dataset % in workspace %: the workspace has no members.', blocked.dataset_id, blocked.workspace_id;
  end if;
  raise exception 'Refusing to delete open data dataset % in workspace %: % of its % members have no $AVANDAR_EMAIL_DOMAIN email.', blocked.dataset_id, blocked.workspace_id, blocked.other_member_count, blocked.member_count;
end \$guard\$;
SQL
  echo "delete from $DATASETS_TABLE where id in ($OPEN_DATA_DATASET_IDS_SQL);"
}

# Writes the statement that raises while any loaded execution still has a
# command line, actor, or host, so none of them can commit.
write_redaction_check() {
  ((${#DUMP_REDACTED_COLUMNS[@]})) || return 0
  local column condition=""
  for column in "${DUMP_REDACTED_COLUMNS[@]}"; do
    condition+="${condition:+ or }$column is not null"
  done
  echo "do \$redacted\$ begin"
  echo "  if exists (select 1 from $EXECUTIONS_TABLE where $condition) then"
  echo "    raise exception '$EXECUTIONS_TABLE still holds a command line, actor, or host after the load.';"
  echo "  end if;"
  echo "end \$redacted\$;"
}

# Writes the statement that raises unless every catalog table holds exactly
# the dump's rows, so a short load cannot commit.
write_row_count_check() {
  local table rows
  echo "do \$counts\$ begin"
  for table in "${CATALOG_TABLES[@]}"; do
    rows="$(count_dump_rows "$LOAD_FILE" "$table")"
    echo "  if (select count(*) from $table) <> $rows then"
    echo "    raise exception '$table holds % rows after the load, not the dump''s $rows.', (select count(*) from $table);"
    echo "  end if;"
  done
  echo "end \$counts\$;"
}

write_import_wrapper() {
  local table
  {
    echo '\set ON_ERROR_STOP on'
    echo '\pset tuples_only on'
    echo '\pset format unaligned'
    echo "begin;"
    echo "set local lock_timeout = '$LOCK_TIMEOUT';"
    if [[ "$IS_REPLACE" == true ]]; then
      write_cascade_check
      write_open_data_dataset_delete
      while read -r table; do
        echo "delete from $table;"
      done < <(catalog_tables_children_first)
    fi
    echo "\\i '$LOAD_FILE'"
    # The dump sets lock_timeout to 0 for the session, so set it again.
    echo "set local lock_timeout = '$LOCK_TIMEOUT';"
    write_storage_rewrite
    write_redaction_check
    write_row_count_check
    echo "select public.data_catalog_facet_counts__refresh();"
    echo "commit;"
  } >"$1"
}

print_plan() {
  local step=1
  echo "Plan, in one transaction that rolls back on any error and waits at most $LOCK_TIMEOUT for each lock:"
  if [[ "$IS_REPLACE" == true ]]; then
    echo "  $step. Lock the catalog and the tables its cascade reaches${OPEN_DATA_DATASET_SUMMARY:+, and only the rows of the open data datasets, their workspaces, memberships, and members}, and check the delete still reaches $DEPENDENT_ROW_COUNT dependent rows."
    step=$((step + 1))
    if [[ "$HAS_OPEN_DATA_DATASETS" == true ]]; then
      echo "  $step. Check every member of each workspace above has an $AVANDAR_EMAIL_DOMAIN email, then delete the $OPEN_DATA_DATASET_SUMMARY added from the catalog, with every row that cascades from them."
      step=$((step + 1))
    fi
    echo "  $step. Delete every catalog row, children first. The replace's deletes delete or change $DEPENDENT_ROW_COUNT dependent rows."
    step=$((step + 1))
  fi
  echo "  $step. Load $DUMP_FILE, and check every catalog table holds the dump's rows."
  step=$((step + 1))
  if [[ -n "$REWRITE_SOURCE_HOST" ]]; then
    echo "  $step. Rewrite Storage URLs from $REWRITE_SOURCE_HOST to $REWRITE_TARGET_HOST."
    step=$((step + 1))
  fi
  echo "  $step. Recount $FACET_COUNTS_TABLE."
}

# Prints why the dump's Storage links stop the import, or nothing.
storage_refusal() {
  local hosts other_hosts
  hosts="$(print_dump_storage_hosts "$LOAD_FILE" | awk '{ print $1 }')"
  [[ -n "$hosts" ]] || return 0
  if [[ -z "$REWRITE_SOURCE_HOST" ]]; then
    echo "the dump's listings link to Storage on $(echo "$hosts" | paste -s -d, -). Pass $REWRITE_FLAG <source-host> <target-host>."
    return 0
  fi
  other_hosts="$(echo "$hosts" | grep -vxF -e "$REWRITE_SOURCE_HOST" -e "$REWRITE_TARGET_HOST" || true)"
  if [[ -n "$other_hosts" ]]; then
    echo "the dump's listings also link to Storage on $(echo "$other_hosts" | paste -s -d, -), which $REWRITE_FLAG does not rewrite."
  fi
}

# Prints why the import must stop before writing, or nothing.
plan_refusal() {
  if [[ "$IS_REPLACE" == true && -n "$BLOCKING_DEPENDENTS" ]]; then
    printf 'foreign keys with no action or restrict would block the delete:\n%s' "$BLOCKING_DEPENDENTS"
  elif [[ "$IS_REPLACE" == true && -n "$GUARD_REFUSAL" ]]; then
    echo "$GUARD_REFUSAL Only datasets in workspaces whose every member has an $AVANDAR_EMAIL_DOMAIN email can be deleted."
  elif [[ "$IS_REPLACE" != true && "$TARGET_HAS_ROWS" == true ]]; then
    echo "the target's catalog already has rows. Check --dry-run --replace-existing first."
  else
    storage_refusal
  fi
}

# Prints the `<table> <rows>` lines of a counts list for only the tables the
# import locks whole, which nothing else can change while it runs.
#
# Usage: locked_counts <counts>
locked_counts() {
  local locked table rows
  locked=" ${CATALOG_TABLES[*]} $FACET_COUNTS_TABLE ${LOCKED_DEPENDENT_TABLES[*]:-} "
  while read -r table rows; do
    [[ -n "$table" && "$locked" == *" $table "* ]] && echo "$table $rows"
  done <<<"$1"
  return 0
}

# Prints how many of the affected open data datasets still exist, by id.
remaining_affected_datasets() {
  local ids
  ids="$(printf "'%s', " "${AFFECTED_DATASET_IDS[@]}")"
  read_target "select count(*) from $DATASETS_TABLE where id::text in (${ids%, })"
}

report_failed_import() {
  print_target_counts "After the failed import, the target holds, per table:" >&2
  local remaining="${#AFFECTED_DATASET_IDS[@]}"
  if ((${#AFFECTED_DATASET_IDS[@]})); then
    remaining="$(remaining_affected_datasets)"
  fi
  if [[ "$(locked_counts "$LAST_COUNTS")" == "$(locked_counts "$BEFORE_COUNTS")" && "$remaining" == "${#AFFECTED_DATASET_IDS[@]}" ]]; then
    echo "The import failed and its transaction rolled back: every catalog count matches the report, and all ${#AFFECTED_DATASET_IDS[@]} open data datasets are still there." >&2
  else
    echo "The import failed, and the catalog counts or the open data datasets differ from the report. Check the target now." >&2
  fi
  exit 1
}

# Says how many of the open data datasets the replace deleted remain, by id.
report_deleted_datasets() {
  ((${#AFFECTED_DATASET_IDS[@]})) || return 0
  echo "Open data datasets the replace deleted that remain, by id: $(remaining_affected_datasets) of ${#AFFECTED_DATASET_IDS[@]}."
}

run_import() {
  local wrapper="$WORK_DIR/import.sql"
  write_import_wrapper "$wrapper"
  # No --single-transaction: the wrapper carries its own begin and commit,
  # so a client-side error stops psql before `commit` and the server rolls
  # the whole transaction back.
  target_psql -X -P pager=off -q --set ON_ERROR_STOP=1 \
    --file "$wrapper" || report_failed_import
  print_target_counts "After the import, the target holds, per table:"
  report_deleted_datasets
  report_orphans_after
}

confirm_all() {
  confirm "$TARGET_FLAG" "${CONFIRMED_TARGET:-}" "$TARGET_ID" "$TARGET_ID"
  if [[ "$IS_REPLACE" == true ]]; then
    confirm "$CASCADE_FLAG" "${CONFIRMED_CASCADE:-}" "$DEPENDENT_ROW_COUNT" \
      "delete $DEPENDENT_ROW_COUNT dependent rows" \
      "${OPEN_DATA_DATASET_SUMMARY:+The replace deletes the $OPEN_DATA_DATASET_SUMMARY added from the catalog.}"
  fi
}

main() {
  parse_args "$@"
  check_target_url
  if [[ -n "${CONFIRMED_TARGET:-}" && "$CONFIRMED_TARGET" != "$TARGET_ID" ]]; then
    fail "$TARGET_FLAG says $CONFIRMED_TARGET, but the target is $TARGET_ID."
  fi
  check_rewrite_hosts
  prepare_dump
  check_psql_version
  report
  local refusal
  refusal="$(plan_refusal)"
  if [[ "$IS_DRY_RUN" == true ]]; then
    [[ "$IS_REPLACE" != true ]] || print_backup_command
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
