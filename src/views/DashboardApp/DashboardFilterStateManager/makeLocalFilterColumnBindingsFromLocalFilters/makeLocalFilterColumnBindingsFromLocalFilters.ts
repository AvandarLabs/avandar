import { isDefined, prop, propEq } from "@avandar/utils";
import { DataVizFilters } from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/DataVizFilters/DataVizFilters";
import type { ColumnBindingIssue } from "$/models/queries/QueryColumnBindings/QueryColumnBindings.types";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { DashboardFilterRecord } from "../DashboardFilterStateManager";
import type { LocalFilter } from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/DataVizFilters/DataVizFilters";
/** An authored local filter whose target is a column ID. */
export type ColumnIdLocalFilter = LocalFilter;
/**
 * Maps each local filter's column ID to its current `QueryResult` column name
 * for the wrapper SQL. A filter whose ID matches no output is reported, never
 * matched by name.
 */
export function makeLocalFilterColumnBindingsFromLocalFilters(
  options: Readonly<{
    filters: readonly ColumnIdLocalFilter[];
    valuesById: Readonly<
      Record<string, string | readonly string[] | undefined>
    >;
    columns: readonly QueryResult.ColumnWithId[];
  }>,
): { resolvedFilters: DashboardFilterRecord[]; issues: ColumnBindingIssue[] } {
  const outcomes = options.filters.map((filter) => {
    const matches = options.columns.filter(propEq("id", filter.columnId));
    const column = matches.length === 1 ? matches[0] : undefined;
    return {
      filter: column
        ? DataVizFilters.localFilterToRecord({
            filter: { ...filter, columnName: column.name },
            value: options.valuesById[filter.id],
          })
        : undefined,
      issue: column
        ? undefined
        : {
            target: filter.id,
            reason:
              matches.length > 1
                ? ("ambiguous" as const)
                : ("missing" as const),
          },
    };
  });
  return {
    resolvedFilters: outcomes.map(prop("filter")).filter(isDefined),
    issues: outcomes.map(prop("issue")).filter(isDefined),
  };
}
