/**
 * Hook that owns the viewer-selected value for each of a viz's local
 * filters. Lives at the DataVizPBlock level (not the global filter manager)
 * so two vizzes can each define a filter on `province` and end up with
 * totally independent viewer-selected values.
 *
 * Re-exports the shared filter types from `dataVizFilters.ts` so the block
 * has a single import surface; the Puck field configs import the same
 * helpers directly.
 */
import { useCallback, useMemo, useState } from "react";
import {
  type LocalFilter,
  parseLocalFilterDefaultValue,
} from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/dataVizFilters";

export type {
  DataVizFilterProps,
  GlobalFilterSubscription,
  GlobalFilterSubscriptionMode,
  LocalFilter,
} from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/dataVizFilters";
export {
  DEFAULT_DATA_VIZ_FILTER_PROPS,
  DEFAULT_GLOBAL_FILTER_SUBSCRIPTION,
  localFilterToRecord,
  parseLocalFilterDefaultValue,
  parseLocalFilterOptions,
  resolveSubscribedFilterIds,
} from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/dataVizFilters";

export type LocalFilterValue = string | readonly string[] | undefined;

export type LocalFilterStateApi = {
  valuesById: Readonly<Record<string, LocalFilterValue>>;
  setValue: (filterId: string, value: LocalFilterValue) => void;
  reset: () => void;
};

/**
 * Hook that seeds local filter values from their configured defaults and
 * keeps viewer-selected values in component state. The seed is recomputed
 * when the editor adds, removes, or reconfigures a local filter so the
 * default propagates without forcing a remount.
 */
export function useLocalFilterState(
  localFilters: readonly LocalFilter[],
): LocalFilterStateApi {
  const initialValues = useMemo(() => {
    const out: Record<string, LocalFilterValue> = {};
    for (const f of localFilters) {
      out[f.id] = parseLocalFilterDefaultValue(f.defaultValue, f.mode);
    }
    return out;
  }, [localFilters]);

  const [overrides, setOverrides] = useState<
    Readonly<Record<string, LocalFilterValue>>
  >({});

  // Drop overrides for filters that no longer exist.
  const valuesById = useMemo(() => {
    const out: Record<string, LocalFilterValue> = { ...initialValues };
    for (const f of localFilters) {
      if (f.id in overrides) {
        out[f.id] = overrides[f.id];
      }
    }
    return out;
  }, [initialValues, localFilters, overrides]);

  const setValue = useCallback(
    (filterId: string, value: LocalFilterValue): void => {
      setOverrides((prev) => {
        return { ...prev, [filterId]: value };
      });
    },
    [],
  );

  const reset = useCallback((): void => {
    setOverrides({});
  }, []);

  return { valuesById, setValue, reset };
}
