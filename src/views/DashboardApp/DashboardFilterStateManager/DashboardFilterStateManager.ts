import { createAppStateManager } from "@/lib/utils/state/createAppStateManager";

/**
 * Value a viewer chose for a filter. Single-select stores a single primitive;
 * multi-select stores an array. `undefined` means the viewer has not picked
 * anything yet (the filter is inactive).
 */
export type DashboardFilterValue =
  | string
  | number
  | boolean
  | null
  | ReadonlyArray<string | number>
  | undefined;

export type DashboardFilterRecord = {
  /**
   * The filter id. Matches the FilterPBlock's `filterId` prop. DataViz blocks
   * subscribe to filters by id.
   */
  filterId: string;
  /** SQL column the filter targets. Used to amend WHERE clauses. */
  columnName: string;
  /** Display label shown to viewers. */
  label: string;
  /** Operator the filter applies. */
  operator: "equals" | "in" | "contains";
  /** Current viewer-selected value. */
  value: DashboardFilterValue;
};

export type DashboardFilterAppState = {
  filtersById: Readonly<Record<string, DashboardFilterRecord>>;
};

const INITIAL_STATE: DashboardFilterAppState = {
  filtersById: {},
};

/**
 * Holds the viewer-editable filter state for a single dashboard render.
 * Mounted by `DashboardEditorView` and `DashboardViewerView` so both the
 * editor preview and the public viewer share the same filter semantics.
 */
export const DashboardFilterStateManager = createAppStateManager({
  name: "DashboardFilter",
  initialState: INITIAL_STATE,
  actions: {
    /** Register a filter on mount of its FilterPBlock. */
    registerFilter: (
      state: DashboardFilterAppState,
      filter: DashboardFilterRecord,
    ): DashboardFilterAppState => {
      const existing = state.filtersById[filter.filterId];
      // Preserve viewer-selected value across re-mounts so the UI doesn't
      // forget what the viewer picked when Puck re-renders the block.
      const merged: DashboardFilterRecord = {
        ...filter,
        value: existing?.value ?? filter.value,
      };
      return {
        ...state,
        filtersById: { ...state.filtersById, [filter.filterId]: merged },
      };
    },
    /** Unregister a filter on unmount (block deleted, etc.). */
    unregisterFilter: (
      state: DashboardFilterAppState,
      filterId: string,
    ): DashboardFilterAppState => {
      if (!state.filtersById[filterId]) {
        return state;
      }
      const { [filterId]: _removed, ...rest } = state.filtersById;
      return { ...state, filtersById: rest };
    },
    /** Update a filter's selected value. */
    setFilterValue: (
      state: DashboardFilterAppState,
      payload: { filterId: string; value: DashboardFilterValue },
    ): DashboardFilterAppState => {
      const existing = state.filtersById[payload.filterId];
      if (!existing) {
        return state;
      }
      return {
        ...state,
        filtersById: {
          ...state.filtersById,
          [payload.filterId]: { ...existing, value: payload.value },
        },
      };
    },
  },
});
