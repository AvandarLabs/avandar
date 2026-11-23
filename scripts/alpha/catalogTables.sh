# shellcheck shell=bash
#-------------------------------------------------------------------------------
# The open data catalog tables, and helpers that read a catalog dump. Sourced
# by exportCatalogData.sh and importCatalogData.sh, so both move exactly the
# same tables.
#
# None of these tables references a workspace, user, or other user-data
# table, so the catalog loads into a database that has none of the source's
# users. `datasets__open_data` references `data_catalog_listings`, but it is a
# workspace's own dataset and is never part of the catalog dump.
#
# `data_catalog_facet_counts` is left out on purpose: it is derived from the
# listings, so the import recounts it with
# `data_catalog_facet_counts__refresh()` instead of copying the source's.
#
# It also holds split_db_url_password, which both scripts use to keep a
# database password off the `psql` and `pg_dump` command lines.
#-------------------------------------------------------------------------------

# Parents before children, so the import order satisfies foreign keys.
# pg_dump orders a data-only dump by foreign key on its own as well.
# shellcheck disable=SC2034 # Read by the scripts that source this file.
CATALOG_TABLES=(
  public.data_catalog_drives
  public.data_catalog_listings
  public.data_catalog_listings__relation_columns
  public.pipeline_executions
  public.pipeline_execution_scopes
  public.pipeline_scope_checkpoints
)

# The derived table the import refreshes after loading the catalog.
# shellcheck disable=SC2034 # Read by the scripts that source this file.
FACET_COUNTS_TABLE=public.data_catalog_facet_counts

# Prints the catalog tables children first, the order to delete them in.
catalog_tables_children_first() {
  local index
  for ((index = ${#CATALOG_TABLES[@]} - 1; index >= 0; index--)); do
    echo "${CATALOG_TABLES[index]}"
  done
}

# Prints how many rows a dump's `COPY` block for one table holds, or 0 when
# the dump has no block for it.
#
# Usage: count_dump_rows <dump.sql> <schema.table>
count_dump_rows() {
  awk -v table="$2" '
    $1 == "COPY" && $2 == table { inside = 1; next }
    inside && $0 == "\\." { inside = 0; next }
    inside { rows++ }
    END { print rows + 0 }
  ' "$1"
}

# Whether a dump has a `COPY` block for one table.
#
# Usage: dump_has_table <dump.sql> <schema.table>
dump_has_table() {
  awk -v table="$2" '
    $1 == "COPY" && $2 == table { found = 1; exit }
    END { exit found ? 0 : 1 }
  ' "$1"
}

# Prints one column of every row in a dump's block for one table, one value
# per line, finding the column by name in the `COPY` header.
#
# Usage: print_dump_column <dump.sql> <schema.table> <column>
print_dump_column() {
  awk -F '\t' -v table="$2" -v wanted="$3" '
    $1 ~ /^COPY / && !inside {
      split($0, words, " ")
      if (words[2] != table) { next }
      header = $0
      sub(/^[^(]*\(/, "", header)
      sub(/\).*$/, "", header)
      count = split(header, columns, ", ")
      column = 0
      for (i = 1; i <= count; i++) { if (columns[i] == wanted) { column = i } }
      inside = 1
      next
    }
    inside && $0 == "\\." { inside = 0; next }
    inside && column { print $column }
  ' "$1"
}

# Prints, per Supabase Storage host, how many rows of a dump's
# `data_catalog_listings` block link to `https://<host>/storage/v1/`, as
# `<host> <rows>` lines sorted by host.
#
# Usage: print_dump_storage_hosts <dump.sql>
print_dump_storage_hosts() {
  awk '
    $0 ~ /^COPY public\.data_catalog_listings \(/ { inside = 1; next }
    inside && $0 == "\\." { inside = 0; next }
    inside {
      line = $0
      split("", seen)
      while (match(line, /https?:\/\/[A-Za-z0-9.:-]+\/storage\/v1\//)) {
        host = substr(line, RSTART, RLENGTH)
        line = substr(line, RSTART + RLENGTH)
        sub(/^https?:\/\//, "", host)
        sub(/\/storage\/v1\/$/, "", host)
        if (!(host in seen)) { seen[host] = 1; rows[host]++ }
      }
    }
    END { for (host in rows) { print host, rows[host] } }
  ' "$1" | LC_ALL=C sort
}

# Prints why a dump looks cut short, one reason per line, or nothing: a
# `COPY` block with no closing `\.`, a `\restrict` with no matching
# `\unrestrict`, or no "PostgreSQL database dump complete" footer.
#
# Usage: print_dump_completeness_problems <dump.sql>
print_dump_completeness_problems() {
  awk '
    inside && $0 == "\\." { inside = 0; next }
    inside { next }
    $1 == "COPY" && $NF == "stdin;" { inside = 1; table = $2; next }
    /^\\restrict / { restrict_key = $2 }
    /^\\unrestrict / { unrestrict_key = $2 }
    /^-- PostgreSQL database dump complete$/ { is_complete = 1 }
    END {
      if (inside) { print "the rows block for " table " has no closing \\." }
      if (restrict_key != unrestrict_key) { print "\\restrict has no matching \\unrestrict" }
      if (!is_complete) { print "the \"PostgreSQL database dump complete\" footer is missing" }
    }
  ' "$1"
}

# The session settings pg_dump writes at the top of a data-only dump. A dump
# with any other `SET`, such as `session_replication_role`, is refused.
DUMP_SETTINGS=(
  "SET statement_timeout = 0;"
  "SET lock_timeout = 0;"
  "SET idle_in_transaction_session_timeout = 0;"
  "SET transaction_timeout = 0;"
  "SET client_encoding = 'UTF8';"
  "SET standard_conforming_strings = on;"
  "SELECT pg_catalog.set_config('search_path', '', false);"
  "SET check_function_bodies = false;"
  "SET xmloption = content;"
  "SET client_min_messages = warning;"
  "SET row_security = off;"
)

# Prints each line of a dump that a data-only catalog dump never contains,
# with its line number, so an import refuses a dump that would do anything
# but load rows into the catalog tables. Allowed outside the `COPY` data:
# blank lines, comments, the settings in DUMP_SETTINGS, psql's `\restrict`
# guard, and a whole `COPY <catalog table> (<columns>) FROM stdin;` line. A
# `COPY` into any other table, `data_catalog_facet_counts` included, is
# reported.
#
# Usage: print_unexpected_dump_lines <dump.sql>
print_unexpected_dump_lines() {
  DUMP_SETTINGS_LINES="$(printf '%s\n' "${DUMP_SETTINGS[@]}")" \
    awk -v tables="${CATALOG_TABLES[*]}" '
    BEGIN {
      split(tables, names, " "); for (i in names) allowed[names[i]] = 1
      split(ENVIRON["DUMP_SETTINGS_LINES"], lines, "\n")
      for (i in lines) allowed_settings[lines[i]] = 1
    }
    inside && $0 == "\\." { inside = 0; next }
    inside { next }
    $1 == "COPY" && ($2 in allowed) && $0 ~ /^COPY [a-z0-9_.]+ \([a-z0-9_", ]+\) FROM stdin;$/ {
      inside = 1
      next
    }
    /^$/ || /^--/ { next }
    $0 in allowed_settings { next }
    /^\\(un)?restrict [A-Za-z0-9]+$/ { next }
    { printf "line %d: %s\n", NR, substr($0, 1, 120) }
  ' "$1"
}

# Prints the column list of a dump's `COPY` header for one table, such as
# `id, pipeline_name`, or nothing when the dump has no block for it.
#
# Usage: print_dump_header_columns <dump.sql> <schema.table>
print_dump_header_columns() {
  awk -v table="$2" '
    $1 == "COPY" && $2 == table && $NF == "stdin;" {
      header = $0
      sub(/^[^(]*\(/, "", header)
      sub(/\) FROM stdin;$/, "", header)
      print header
      exit
    }
  ' "$1"
}

# Prints a dump with every value of some columns of one table set to `\N`,
# null. Only that table's rows change; every other line prints as it is.
#
# Usage: redact_dump_columns <dump.sql> <schema.table> <column>...
redact_dump_columns() {
  local dump="$1" table="$2"
  shift 2
  awk -F '\t' -v OFS='\t' -v table="$table" -v redacted="$*" '
    BEGIN { split(redacted, names, " "); for (i in names) is_redacted[names[i]] = 1 }
    !inside && $0 ~ /^COPY [^\t]* FROM stdin;$/ {
      inside = 1
      split($0, words, " ")
      is_table = words[2] == table
      split("", positions)
      if (is_table) {
        header = $0
        sub(/^[^(]*\(/, "", header)
        sub(/\).*$/, "", header)
        count = split(header, columns, ", ")
        for (i = 1; i <= count; i++) { if (columns[i] in is_redacted) { positions[i] = 1 } }
      }
      print
      next
    }
    inside && $0 == "\\." { inside = 0; is_table = 0; print; next }
    inside && is_table { for (i in positions) { $i = "\\N" } print; next }
    { print }
  ' "$dump"
}

# Decodes a URL's `%XX` escapes into PERCENT_DECODED, as libpq does, and
# returns 1 for a `%` not followed by two hex digits. It sets a variable
# instead of printing, so a decoded trailing newline survives.
#
# Usage: percent_decode <text>
percent_decode() {
  local encoded="$1" index=0 character hex
  PERCENT_DECODED=""
  while ((index < ${#encoded})); do
    character="${encoded:index:1}"
    index=$((index + 1))
    if [[ "$character" == % ]]; then
      hex="${encoded:index:2}"
      [[ "$hex" =~ ^[0-9A-Fa-f]{2}$ ]] || return 1
      printf -v character '%b' "\\x$hex"
      index=$((index + 2))
    fi
    PERCENT_DECODED+="$character"
  done
}

# Whether an argument looks like a connection URL, which the scripts refuse
# as an argument because `ps` shows it.
#
# Usage: looks_like_db_url <argument>
looks_like_db_url() {
  [[ "$1" == *://* ]]
}

# Splits the password out of a `postgres://` or `postgresql://` URL, so a
# command line can carry the URL without it while the password travels in
# PGPASSWORD: `ps` shows every process's arguments to every user, but its
# environment only to its own user and root. Sets DB_URL_WITHOUT_PASSWORD, and
# DB_URL_PASSWORD to the percent-decoded password, empty when the URL has
# none. Any other connection string passes through unchanged. Returns 1 when
# the password has an invalid percent-encoding.
#
# Usage: split_db_url_password <url>
split_db_url_password() {
  local pattern='^(postgres(ql)?://[^:@/?#]*):([^@/?#]*)@(.*)$'
  DB_URL_WITHOUT_PASSWORD="$1"
  DB_URL_PASSWORD=""
  [[ "$1" =~ $pattern ]] || return 0
  DB_URL_WITHOUT_PASSWORD="${BASH_REMATCH[1]}@${BASH_REMATCH[4]}"
  percent_decode "${BASH_REMATCH[3]}" || return 1
  DB_URL_PASSWORD="$PERCENT_DECODED"
}
