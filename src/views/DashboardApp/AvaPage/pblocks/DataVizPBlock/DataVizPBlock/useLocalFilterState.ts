import { makeObject } from "@avandar/utils";
import { useCallback, useMemo, useState } from "react";
import { DataVizFilters } from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/DataVizFilters/DataVizFilters";
import type { LocalFilter } from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/DataVizFilters/DataVizFilters";

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
 * Tracks values for a visualization's local filters and provides controls to
 * update or reset them.
 * Use it, for example, to manage a viewer's filter selections in a
 * visualization.
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
