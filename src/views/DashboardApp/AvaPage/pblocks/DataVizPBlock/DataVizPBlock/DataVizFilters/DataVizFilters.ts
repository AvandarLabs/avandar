import type { DashboardFilterMode } from "$/types/dashboard.types";
import type { DashboardFilterRecord } from "@/views/DashboardApp/DashboardFilterStateManager/DashboardFilterStateManager";

import { matchLiteral, prop } from "@avandar/utils";

export type GlobalFilterSubscriptionMode = "all" | "selected" | "none";

export type LocalFilter = {
  /** Stable identifier used for viewer state. */
  id: string;
  /** Display label shown above the input. */
  label: string;
  /** SQL column targeted by the filter. */
  columnName: string;
  /** Input and SQL-comparison behavior. */
  mode: DashboardFilterMode;
  /** Comma-separated allowed values for selection modes. */
  optionsRaw: string;
  /** Default value, encoded as JSON for multi-select filters. */
  defaultValue: string;
};

export type GlobalFilterSubscription = {
  /** How the visualization reacts to dashboard filters. */
  mode: GlobalFilterSubscriptionMode;
  /** Filter identifiers used by selected-mode subscriptions. */
  subscribedFilterIds: readonly string[];
};

export type DataVizFilterProps = {
  /** Dashboard-level filters applied to the visualization. */
  globalFilterSubscription: GlobalFilterSubscription;
  /** Visualization-only filters rendered above the chart. */
  localFilters: readonly LocalFilter[];
};

type ResolveSubscribedFilterIdsOptions = {
  subscription: GlobalFilterSubscription;
  registeredFilters: readonly DashboardFilterRecord[];
};

type ParseLocalFilterDefaultValueOptions = {
  defaultValue: string;
  mode: LocalFilter["mode"];
};

type LocalFilterToRecordOptions = {
  filter: LocalFilter;
  value: string | readonly string[] | undefined;
};

const DEFAULT_GLOBAL_FILTER_SUBSCRIPTION: GlobalFilterSubscription = {
  mode: "all",
  subscribedFilterIds: [],
};

const DEFAULT_DATA_VIZ_FILTER_PROPS: DataVizFilterProps = {
  globalFilterSubscription: DEFAULT_GLOBAL_FILTER_SUBSCRIPTION,
  localFilters: [],
};

function _resolveSubscribedFilterIds(
  options: Readonly<ResolveSubscribedFilterIdsOptions>,
): string[] | undefined {
  return matchLiteral(options.subscription.mode, {
    all: () => {
      return undefined;
    },
    none: () => {
      return [];
    },
    selected: () => {
      const liveFilterIds = new Set(
        options.registeredFilters.map(prop("filterId")),
      );
      return options.subscription.subscribedFilterIds.filter((filterId) => {
        return liveFilterIds.has(filterId);
      });
    },
  });
}

function _parseLocalFilterOptions(rawOptions: string): string[] {
  return rawOptions
    .split(",")
    .map((option) => {
      return option.trim();
    })
    .filter((option) => {
      return option.length > 0;
    });
}

function _parseLocalFilterDefaultValue(
  options: Readonly<ParseLocalFilterDefaultValueOptions>,
): string | string[] | undefined {
  if (options.mode !== "select_multi") {
    return options.defaultValue.length > 0 ? options.defaultValue : undefined;
  }

  try {
    const parsedValue = JSON.parse(options.defaultValue) as unknown;
    return Array.isArray(parsedValue)
      ? parsedValue.filter((value): value is string => {
          return typeof value === "string";
        })
      : _parseLocalFilterOptions(options.defaultValue);
  } catch {
    return _parseLocalFilterOptions(options.defaultValue);
  }
}

function _localFilterToRecord(
  options: Readonly<LocalFilterToRecordOptions>,
): DashboardFilterRecord {
  const operator = matchLiteral(options.filter.mode, {
    select_multi: "in" as const,
    contains: "contains" as const,
    select_single: "equals" as const,
  });
  return {
    filterId: options.filter.id,
    columnName: options.filter.columnName,
    label: options.filter.label,
    operator,
    value: options.value,
  };
}

/**
 * Defines per-visualization filter defaults and transforms filter state.
 */
export const DataVizFilters = {
  /** Default subscription used by new visualization blocks. */
  defaultGlobalFilterSubscription: DEFAULT_GLOBAL_FILTER_SUBSCRIPTION,
  /** Default filter properties used by new visualization blocks. */
  defaultDataVizFilterProps: DEFAULT_DATA_VIZ_FILTER_PROPS,
  /** Returns active dashboard-filter identifiers for a visualization. */
  resolveSubscribedFilterIds: _resolveSubscribedFilterIds,
  /** Returns normalized selection options from comma-separated input. */
  parseLocalFilterOptions: _parseLocalFilterOptions,
  /** Returns the viewer value encoded by a local filter default. */
  parseLocalFilterDefaultValue: _parseLocalFilterDefaultValue,
  /** Converts local filter state into the shared dashboard filter shape. */
  localFilterToRecord: _localFilterToRecord,
};
