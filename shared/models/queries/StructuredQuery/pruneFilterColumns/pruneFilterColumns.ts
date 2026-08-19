import { isDefined } from "@avandar/utils";
import type {
  QueryFilter,
  QueryFilterGroup,
} from "$/models/queries/StructuredQuery/QueryFilter.types.ts";

/** A pruned filter tree plus the column names whose rules were removed. */
export type PruneFilterColumnsResult = {
  filters: QueryFilterGroup;
  /** Distinct column names whose rules were removed, in tree order. */
  removedColumnNames: string[];
};

/**
 * Collects removed column names in tree order without duplicates. The `Set`
 * carries membership so the check stays constant-time as the list grows; the
 * array preserves the order the names are reported in.
 */
type RemovedColumns = {
  order: string[];
  seen: Set<string>;
};

function _prune(
  group: QueryFilterGroup,
  columnNames: ReadonlySet<string>,
  removed: RemovedColumns,
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
      if (!removed.seen.has(child.columnName)) {
        removed.seen.add(child.columnName);
        removed.order.push(child.columnName);
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
 * column names lets the form say what it dropped instead of doing it silently.
 */
export function pruneFilterColumns(
  options: Readonly<{
    filters: QueryFilterGroup;
    availableColumnNames: readonly string[];
  }>,
): PruneFilterColumnsResult {
  const { filters, availableColumnNames } = options;
  const removed: RemovedColumns = { order: [], seen: new Set() };
  const pruned = _prune(filters, new Set(availableColumnNames), removed);
  return {
    filters: removed.order.length === 0 ? filters : pruned,
    removedColumnNames: removed.order,
  };
}
