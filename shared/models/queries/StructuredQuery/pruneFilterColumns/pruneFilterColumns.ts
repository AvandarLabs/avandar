import { isDefined } from "@avandar/utils";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import type {
  QueryFilter,
  QueryFilterGroup,
} from "$/models/queries/StructuredQuery/QueryFilter.types.ts";

/** A pruned filter tree plus the column IDs whose rules were removed. */
export type PruneFilterColumnsResult = {
  filters: QueryFilterGroup;
  /** Distinct column IDs whose rules were removed, in tree order. */
  removedColumnIds: QueryColumn.Id[];
};

/**
 * Collects removed column IDs in tree order without duplicates. The `Set`
 * carries membership so the check stays constant-time as the list grows; the
 * array preserves the order the IDs are reported in.
 */
type RemovedColumns = {
  order: QueryColumn.Id[];
  seen: Set<QueryColumn.Id>;
};

function _prune(
  group: QueryFilterGroup,
  columnIds: ReadonlySet<QueryColumn.Id>,
  removed: RemovedColumns,
): QueryFilterGroup {
  const rules = group.rules
    .map((child): QueryFilter | undefined => {
      if (child.type === "group") {
        const pruned = _prune(child, columnIds, removed);
        return pruned.rules.length === 0 ? undefined : pruned;
      }
      if (columnIds.has(child.columnId)) {
        return child;
      }
      if (!removed.seen.has(child.columnId)) {
        removed.seen.add(child.columnId);
        removed.order.push(child.columnId);
      }
      return undefined;
    })
    .filter(isDefined);
  return { ...group, rules };
}

/**
 * Removes rules that reference columns the data source no longer has.
 *
 * Do not keep those rules: they would query a table without those columns and
 * fail with a binder error the UI reports as zero rows. Returning the removed
 * column IDs lets the form say what it dropped instead of doing it silently.
 */
export function pruneFilterColumns(
  options: Readonly<{
    filters: QueryFilterGroup;
    availableColumnIds: readonly QueryColumn.Id[];
  }>,
): PruneFilterColumnsResult {
  const { filters, availableColumnIds } = options;
  const removed: RemovedColumns = { order: [], seen: new Set() };
  const pruned = _prune(filters, new Set(availableColumnIds), removed);
  return {
    filters: removed.order.length === 0 ? filters : pruned,
    removedColumnIds: removed.order,
  };
}
