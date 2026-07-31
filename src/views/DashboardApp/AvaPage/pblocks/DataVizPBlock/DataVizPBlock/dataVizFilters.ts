/**
 * Per-viz filter configuration shared between the DataViz block render and
 * its Puck side-panel fields.
 *
 * Two independent axes live here:
 *
 *   1. **Global filter subscription** — how the viz reacts to dashboard-wide
 *      FilterPBlocks. `all` (default) subscribes to everything; `none` opts
 *      out completely; `selected` lets the editor pick a subset by filter id.
 *
 *   2. **Local filters** — viz-only filter controls that render inline above
 *      the chart. They don't bleed into the global filter manager, so two
 *      vizzes can each define a filter on `province` with totally
 *      independent viewer-selected values.
 */
import type { DashboardFilterRecord } from "@/views/DashboardApp/DashboardFilterStateManager/DashboardFilterStateManager";

export type GlobalFilterSubscriptionMode = "all" | "selected" | "none";

export type LocalFilter = {
  /** Stable id used as the React key + viewer-state key. */
  id: string;
  /** Display label shown above the input in the viz. */
  label: string;
  /** SQL column name the filter targets. */
  columnName: string;
  /** Filter behaviour. */
  mode: "select_single" | "select_multi" | "contains";
  /**
   * Comma-separated allowed values. Required for `select_*` modes; empty
   * string means "no constraint" (the input shows a hint).
   */
  optionsRaw: string;
  /** Optional default value. JSON array for multi-select; string otherwise. */
  defaultValue: string;
};

export type GlobalFilterSubscription = {
  /** How this viz reacts to dashboard-wide FilterPBlocks. */
  mode: GlobalFilterSubscriptionMode;
  /**
   * Filter ids this viz subscribes to when `mode === "selected"`. Ignored
   * otherwise.
   */
  subscribedFilterIds: readonly string[];
};

export type DataVizFilterProps = {
  globalFilterSubscription: GlobalFilterSubscription;
  /** Viz-only filters rendered inline above the chart. */
  localFilters: readonly LocalFilter[];
};

export const DEFAULT_GLOBAL_FILTER_SUBSCRIPTION: GlobalFilterSubscription = {
  mode: "all",
  subscribedFilterIds: [],
};

export const DEFAULT_DATA_VIZ_FILTER_PROPS: DataVizFilterProps = {
  globalFilterSubscription: DEFAULT_GLOBAL_FILTER_SUBSCRIPTION,
  localFilters: [],
};

/**
 * Resolve which global filter ids the viz subscribes to. Returns `undefined`
 * to mean "all of them" (the default for `applyDashboardFiltersToSql`); an
 * empty array to mean "none"; or the explicit subscription list.
 */
export function resolveSubscribedFilterIds(
  subscription: GlobalFilterSubscription,
  registeredFilters: readonly DashboardFilterRecord[],
): readonly string[] | undefined {
  if (subscription.mode === "all") return undefined;
  if (subscription.mode === "none") return [];
  // "selected": drop ids that no longer exist on the dashboard so removing a
  // FilterPBlock doesn't leave dangling references behind.
  const liveIds = new Set(
    registeredFilters.map((f) => {
      return f.filterId;
    }),
  );
  return subscription.subscribedFilterIds.filter((id) => {
    return liveIds.has(id);
  });
}

/**
 * Parse a local filter's `optionsRaw` value into a clean string list,
 * trimming whitespace and dropping empties.
 */
export function parseLocalFilterOptions(raw: string): readonly string[] {
  return raw
    .split(",")
    .map((s) => {
      return s.trim();
    })
    .filter((s) => {
      return s.length > 0;
    });
}

/**
 * Parse a local filter's default value into the right shape for its mode.
 * Multi-select accepts either a JSON array or a comma-separated list.
 */
export function parseLocalFilterDefaultValue(
  defaultValue: string,
  mode: LocalFilter["mode"],
): string | readonly string[] | undefined {
  if (mode === "select_multi") {
    try {
      const parsed = JSON.parse(defaultValue) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.filter((p): p is string => {
          return typeof p === "string";
        });
      }
    } catch {
      // fall through to csv parse
    }
    return parseLocalFilterOptions(defaultValue);
  }
  return defaultValue.length > 0 ? defaultValue : undefined;
}

/**
 * Convert a `(LocalFilter, viewerValue)` pair into the
 * `DashboardFilterRecord` shape that `applyDashboardFiltersToSql` already
 * understands. Lets us reuse the global filter SQL composer for local
 * filters without duplicating the WHERE-clause logic.
 */
export function localFilterToRecord(
  filter: LocalFilter,
  value: string | readonly string[] | undefined,
): DashboardFilterRecord {
  const operator: DashboardFilterRecord["operator"] =
    filter.mode === "select_multi" ? "in"
    : filter.mode === "contains" ? "contains"
    : "equals";
  return {
    filterId: filter.id,
    columnName: filter.columnName,
    label: filter.label,
    operator,
    value,
  };
}
