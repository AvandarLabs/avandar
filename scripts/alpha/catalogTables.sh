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

# Prints the `id` of every row in a dump's `data_catalog_listings` block,
# one per line, finding the column by name in the `COPY` header.
#
# Usage: print_dump_listing_ids <dump.sql>
print_dump_listing_ids() {
  awk -F '\t' '
    $0 ~ /^COPY public\.data_catalog_listings \(/ {
      header = $0
      sub(/^[^(]*\(/, "", header)
      sub(/\).*$/, "", header)
      count = split(header, columns, ", ")
      for (i = 1; i <= count; i++) { if (columns[i] == "id") { column = i } }
      inside = 1
      next
    }
    inside && $0 == "\\." { inside = 0; next }
    inside && column { print $column }
  ' "$1"
}

# Prints each line of a dump that a data-only catalog dump never contains,
# with its line number, so an import refuses a dump that would do anything
# but load rows into the catalog tables. Allowed outside the `COPY` data:
# blank lines, comments, `SET`, the `search_path` reset, psql's `\restrict`
# guard, and `COPY` into a catalog table. A `COPY` into any other table,
# `data_catalog_facet_counts` included, is reported.
#
# Usage: print_unexpected_dump_lines <dump.sql>
print_unexpected_dump_lines() {
  awk -v tables="${CATALOG_TABLES[*]}" '
    BEGIN { split(tables, names, " "); for (i in names) allowed[names[i]] = 1 }
    inside && $0 == "\\." { inside = 0; next }
    inside { next }
    $1 == "COPY" && ($2 in allowed) && $NF == "stdin;" { inside = 1; next }
    /^$/ || /^--/ { next }
    /^SET [a-z_]+ = [^;]*;$/ { next }
    /^SELECT pg_catalog\.set_config\(.search_path., .., false\);$/ { next }
    /^\\(un)?restrict [A-Za-z0-9]+$/ { next }
    { printf "line %d: %s\n", NR, substr($0, 1, 120) }
  ' "$1"
}
