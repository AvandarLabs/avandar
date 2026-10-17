import { DataVizFilters } from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/DataVizFilters/DataVizFilters";
import type { BindingIssue } from "$/models/queries/QueryColumnBindings/QueryColumnBindings";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { DashboardFilterRecord } from "../DashboardFilterStateManager";
import type { LocalFilter } from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/DataVizFilters/DataVizFilters";
/** An authored local filter whose target is an output identity. */
export type BoundLocalFilter = LocalFilter;
type Options = {
  filters: readonly BoundLocalFilter[];
  valuesById: Readonly<Record<string, string | readonly string[] | undefined>>;
  columns: readonly QueryResult.BoundColumn[];
};

type Resolution = {
  resolvedFilters: DashboardFilterRecord[];
  issues: BindingIssue[];
};

/** Resolves local identities to SQL-boundary records without name fallback. */
export function resolveLocalDashboardFilterBindings(
  options: Readonly<Options>,
): Resolution {
  const resolvedFilters: DashboardFilterRecord[] = [];
  const issues: BindingIssue[] = [];
  for (const filter of options.filters) {
    const matches = options.columns.filter((column) => {
      return column.id === filter.columnId;
    });
    const column = matches.length === 1 ? matches[0] : undefined;
    if (!column) {
      issues.push({
        target: filter.id,
        reason: matches.length > 1 ? "ambiguous" : "missing",
      });
      continue;
    }
    resolvedFilters.push(
      DataVizFilters.localFilterToRecord({
        filter: { ...filter, columnName: column.name },
        value: options.valuesById[filter.id],
      }),
    );
  }
  return { resolvedFilters, issues };
}
