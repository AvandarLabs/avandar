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
#-------------------------------------------------------------------------------

# Parents before children, so the import order satisfies foreign keys.
# pg_dump orders a data-only dump by foreign key on its own as well.
# shellcheck disable=SC2034 # Read by the scripts that source this file.
CATALOG_TABLES=(
  public.data_catalog_drives
  public.data_catalog_listings
  public.data_catalog_listings__relation_columns
  public.data_catalog_facet_counts
  public.pipeline_executions
  public.pipeline_execution_scopes
  public.pipeline_scope_checkpoints
)

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

# Prints each line of a dump that a data-only catalog dump never contains,
# with its line number, so an import refuses a dump that would do anything
# but load rows into the catalog tables. Allowed outside the `COPY` data:
# blank lines, comments, `SET`, the `search_path` reset, sequence `setval`
# calls, psql's `\restrict` guard, and `COPY` into a catalog table.
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
    /^SELECT pg_catalog\.setval\(.public\.[a-z_0-9]+., [0-9]+, (true|false)\);$/ { next }
    /^\\(un)?restrict [A-Za-z0-9]+$/ { next }
    { printf "line %d: %s\n", NR, substr($0, 1, 120) }
  ' "$1"
}
