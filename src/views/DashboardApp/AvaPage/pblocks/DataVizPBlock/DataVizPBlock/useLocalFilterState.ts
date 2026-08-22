import type { LocalFilter } from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/DataVizFilters/DataVizFilters";

import { makeObject } from "@avandar/utils";
import { useCallback, useMemo, useState } from "react";

import { DataVizFilters } from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/DataVizFilters/DataVizFilters";

export type {
  DataVizFilterProps,
  GlobalFilterSubscription,
  GlobalFilterSubscriptionMode,
  LocalFilter,
} from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/DataVizFilters/DataVizFilters";
export type LocalFilterValue = string | readonly string[] | undefined;

export type LocalFilterStateApi = {
  valuesById: Record<string, LocalFilterValue>;
  setValue: (
    options: Readonly<{ filterId: string; value: LocalFilterValue }>,
  ) => void;
  reset: () => void;
};

/**
 * Returns viewer-selected values for a visualization's local filters.
 */
export function useLocalFilterState(
  localFilters: readonly LocalFilter[],
): LocalFilterStateApi {
  const initialValues = useMemo(() => {
    return makeObject(localFilters, {
      key: "id",
      valueFn: (localFilter) => {
        return DataVizFilters.parseLocalFilterDefaultValue({
          defaultValue: localFilter.defaultValue,
          mode: localFilter.mode,
        });
      },
    });
  }, [localFilters]);

  const [overrides, setOverrides] = useState<Record<string, LocalFilterValue>>(
    {},
  );

  // Drop overrides for filters that no longer exist.
  const valuesById = useMemo(() => {
    return makeObject(localFilters, {
      key: "id",
      valueFn: (localFilter) => {
        return localFilter.id in overrides
          ? overrides[localFilter.id]
          : initialValues[localFilter.id];
      },
    });
  }, [initialValues, localFilters, overrides]);

  const setValue = useCallback(
    (
      options: Readonly<{ filterId: string; value: LocalFilterValue }>,
    ): void => {
      setOverrides((previousOverrides) => {
        return {
          ...previousOverrides,
          [options.filterId]: options.value,
        };
      });
    },
    [],
  );

  const reset = useCallback((): void => {
    setOverrides({});
  }, []);

  return { valuesById, setValue, reset };
}
