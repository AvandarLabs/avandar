import type {
  QueryFilter,
  QueryFilterGroup,
} from "$/models/queries/StructuredQuery/QueryFilter.types.ts";

export type PruneFilterColumnsResult = {
  filters: QueryFilterGroup;
  /** Distinct column names whose rules were removed, in tree order. */
  removedColumnNames: readonly string[];
};

function _prune(
  group: QueryFilterGroup,
  columnNames: ReadonlySet<string>,
  removed: string[],
): QueryFilterGroup {
  const rules = group.rules
    .map((child): QueryFilter | undefined => {
      if (child.type === "group") {
        const pruned = _prune(child, columnNames, removed);
        return pruned.rules.length === 0 ? undefined : pruned;
      }
      if (columnNames.has(child.columnName)) {
        return child;
      }
      if (!removed.includes(child.columnName)) {
        removed.push(child.columnName);
      }
      return undefined;
    })
    .filter((child): child is QueryFilter => {
      return child !== undefined;
    });
  return { ...group, rules };
}

/**
 * Removes rules that reference columns the data source no longer has.
 *
 * Called when the data source changes: keeping such rules meant the query ran
 * against a table without those columns and failed with a binder error that the
 * UI reported as zero rows. Returning the removed column names lets the form
 * say what it dropped instead of doing it silently.
 */
export function pruneFilterColumns(
  filters: QueryFilterGroup,
  availableColumnNames: readonly string[],
): PruneFilterColumnsResult {
  const removed: string[] = [];
  const pruned = _prune(filters, new Set(availableColumnNames), removed);
  return {
    filters: removed.length === 0 ? filters : pruned,
    removedColumnNames: removed,
  };
}
