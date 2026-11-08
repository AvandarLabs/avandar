import { isDefined, prop, propEq } from "@avandar/utils";
import { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import { DataVizFilters } from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/DataVizFilters/DataVizFilters";
import type { QueryResultColumnBindingIssue } from "$/models/queries/QueryResultColumnBindings/QueryResultColumnBindings.types";
import type { DashboardFilterRecord } from "../DashboardFilterStateManager";
import type { LocalFilter } from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/DataVizFilters/DataVizFilters";
/** An authored local filter whose target is a column ID. */
export type ColumnIdLocalFilter = LocalFilter;
type FilterOutcome = {
  filter: DashboardFilterRecord | undefined;
  issue: QueryResultColumnBindingIssue | undefined;
};

function _getFilterOutcome(
  options: Readonly<{
    filter: ColumnIdLocalFilter;
    value: string | readonly string[] | undefined;
    columns: readonly QueryResult.ColumnWithId[];
  }>,
): FilterOutcome {
  const { filter, value, columns } = options;
  const matches = columns.filter(propEq("id", filter.columnId));
  const column = matches.length === 1 ? matches[0] : undefined;
  if (column && QueryResult.isListColumn(column)) {
    return {
      filter: undefined,
      issue: { target: filter.id, reason: "unsupported" },
    };
  }
  if (!column) {
    return {
      filter: undefined,
      issue: {
        target: filter.id,
        reason: matches.length > 1 ? "ambiguous" : "missing",
      },
    };
  }
  return {
    filter: DataVizFilters.localFilterToRecord({
      filter: { ...filter, columnName: column.name },
      value,
    }),
    issue: undefined,
  };
}

/**
 * Maps each local filter's column ID to its current `QueryResult` column name
 * for the wrapper SQL. A filter whose ID matches no `QueryResult` column is
 * reported, never matched by name. A filter on a list column is reported as
 * unsupported, since the wrapper SQL's `IN`, `ILIKE`, and `=` fail on a list.
 */
export function makeLocalFilterColumnBindingsFromLocalFilters(
  options: Readonly<{
    filters: readonly ColumnIdLocalFilter[];
    valuesById: Readonly<
      Record<string, string | readonly string[] | undefined>
    >;
    columns: readonly QueryResult.ColumnWithId[];
  }>,
): {
  resolvedFilters: DashboardFilterRecord[];
  issues: QueryResultColumnBindingIssue[];
} {
  const outcomes = options.filters.map((filter) => {
    return _getFilterOutcome({
      filter,
      value: options.valuesById[filter.id],
      columns: options.columns,
    });
  });
  return {
    resolvedFilters: outcomes.map(prop("filter")).filter(isDefined),
    issues: outcomes.map(prop("issue")).filter(isDefined),
  };
}
