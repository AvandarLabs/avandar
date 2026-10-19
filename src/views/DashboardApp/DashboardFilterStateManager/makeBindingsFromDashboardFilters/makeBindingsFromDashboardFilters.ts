import { propEq } from "@avandar/utils";
import { getColumnIdFromLegacyName } from "$/models/queries/QueryColumnBindings/getColumnIdFromLegacyName/getColumnIdFromLegacyName";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { BindingIssue } from "$/models/queries/QueryColumnBindings/QueryColumnBindings.types";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { DashboardFilterRecord } from "../DashboardFilterStateManager";

/** A chart-owned target, independent of the filter control and viewer value. */
export type DashboardFilterTarget =
  | { kind: "bound"; columnId: QueryColumn.Id; authoringColumnName: string }
  | { kind: "legacy"; columnName: string }
  | { kind: "unresolved"; columnName: string; reason: "missing" | "ambiguous" };
/** Chart-owned targets indexed by filter control ID. */
export type DashboardFilterTargets = Readonly<
  Record<string, DashboardFilterTarget>
>;
type Options = {
  filters: readonly DashboardFilterRecord[];
  targets: DashboardFilterTargets;
  columns: readonly QueryResult.BoundColumn[];
  subscribedFilterIds?: readonly string[];
};

type Resolution = {
  targets: DashboardFilterTargets;
  resolvedFilters: DashboardFilterRecord[];
  issues: BindingIssue[];
};

function _buildTarget({
  filter,
  saved,
  columns,
}: {
  filter: Readonly<DashboardFilterRecord>;
  saved: DashboardFilterTarget | undefined;
  columns: readonly QueryResult.BoundColumn[];
}): DashboardFilterTarget {
  const authoredName =
    saved?.kind === "bound" ? saved.authoringColumnName : saved?.columnName;
  const target = authoredName === filter.columnName ? saved : undefined;
  if (target && target.kind !== "legacy") {
    return target;
  }
  const columnId = getColumnIdFromLegacyName({
    name: filter.columnName,
    columns: columns,
  });
  if (columnId) {
    return { kind: "bound", columnId, authoringColumnName: filter.columnName };
  }
  const hasCandidate = columns.some((column) => {
    return column.name.toLowerCase() === filter.columnName.toLowerCase();
  });
  return {
    kind: "unresolved",
    columnName: filter.columnName,
    reason: hasCandidate ? "ambiguous" : "missing",
  };
}

function _buildFilter({
  filter,
  target,
  columns,
}: {
  filter: Readonly<DashboardFilterRecord>;
  target: DashboardFilterTarget;
  columns: readonly QueryResult.BoundColumn[];
}): DashboardFilterRecord | BindingIssue {
  const matches =
    target.kind === "bound"
      ? columns.filter(propEq("id", target.columnId))
      : [];
  const column = matches.length === 1 ? matches[0] : undefined;
  return column
    ? { ...filter, columnName: column.name }
    : {
        target: filter.filterId,
        reason:
          target.kind === "unresolved"
            ? target.reason
            : matches.length > 1
              ? "ambiguous"
              : "missing",
      };
}

/**
 * Resolves subscribed filter targets to SQL-boundary output names. Preserve
 * returned targets across value updates. Explicit query edits may reset only
 * unresolved legacy targets to `legacy`. Bound targets retain their IDs even
 * when absent. Definition name edits are detected from authoring metadata.
 */
export function makeBindingsFromDashboardFilters(
  options: Readonly<Options>,
): Resolution {
  return options.filters
    .filter((filter) => {
      return (
        !options.subscribedFilterIds ||
        options.subscribedFilterIds.includes(filter.filterId)
      );
    })
    .reduce<Resolution>(
      (resolution, filter) => {
        const target = _buildTarget({
          filter,
          saved: resolution.targets[filter.filterId],
          columns: options.columns,
        });
        const resolved = _buildFilter({
          filter,
          target,
          columns: options.columns,
        });
        return {
          targets: { ...resolution.targets, [filter.filterId]: target },
          resolvedFilters:
            "filterId" in resolved
              ? [...resolution.resolvedFilters, resolved]
              : resolution.resolvedFilters,
          issues:
            "filterId" in resolved
              ? resolution.issues
              : [...resolution.issues, resolved],
        };
      },
      { targets: { ...options.targets }, resolvedFilters: [], issues: [] },
    );
}
