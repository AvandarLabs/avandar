import { where } from "@utils/filters/where/where";
import { isNonNullish } from "@utils/guards/isNonNullish/isNonNullish";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { useEffect, useMemo, useRef, useState } from "react";
import { DatasetClient } from "@/clients/datasets/DatasetClient";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { EntityFieldConfigClient } from "@/clients/entities/EntityFieldConfigClient";
import { EntityConfigClient } from "@/clients/entity-configs/EntityConfigClient";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { DataExplorerStateManager } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";
import {
  shouldDeferURLHydrationForStructuredLoading,
  urlSearchHasHydrateableExplorerKeys,
} from "@/views/DataExplorerApp/dataExplorerURLHydration";
import {
  isDefaultExplorerState,
  parseURLSearch,
  serializeStateToURL,
} from "@/views/DataExplorerApp/DataExplorerURLState";
import type { DataExplorerURLSearch } from "@/views/DataExplorerApp/DataExplorerURLState";

type Options = {
  urlSearch: DataExplorerURLSearch;
  navigate: (options: {
    search: DataExplorerURLSearch;
    replace: boolean;
  }) => void;
};

/**
 * Manages two-way sync between the Data Explorer's in-memory state and the
 * URL search params:
 *
 * - **Hydration (URL → state):** On first mount, if the store is still at
 *   its default empty state, the hook restores data source, column
 *   selections, aggregations, order-by, raw SQL, and viz config from the URL
 *   params. If `sql` is present in the URL, only raw SQL (plus viz / open
 *   dataset) is applied — `ds` and `cols` are ignored so a stale Manual Query
 *   cannot block restore or conflict with the SQL text. Column objects are
 *   re-fetched via TanStack Query (cached) and matched by
 *   `baseColumn.name` when structured params are used.
 *
 * - **Persistence (state → URL):** After hydration is complete, every state
 *   change is serialised back to the URL using `replace: true` so the browser
 *   history stays clean.
 */
export function useDataExplorerURLSync({ urlSearch, navigate }: Options): void {
  const state = DataExplorerStateManager.useState();
  const dispatch = DataExplorerStateManager.useDispatch();
  const workspace = useCurrentWorkspace();

  const urlState = useMemo(() => {
    return parseURLSearch(urlSearch);
  }, [urlSearch]);

  // Data source lookup — these are already fetched by QueryDataSourceSelect
  // so TanStack Query will return cached results with no extra network call.
  const [datasets] = DatasetClient.useGetAll(
    where("workspace_id", "eq", workspace.id),
  );
  const [entityConfigs] = EntityConfigClient.useGetAll(
    where("workspace_id", "eq", workspace.id),
  );

  const restoredDataSource = useMemo(() => {
    if (!urlState.dsId) {
      return undefined;
    }
    return [...(datasets ?? []), ...(entityConfigs ?? [])].find((ds) => {
      return ds.id === urlState.dsId;
    });
  }, [urlState.dsId, datasets, entityConfigs]);

  const needsColumns =
    (urlState.colNames?.length ?? 0) > 0 && Boolean(urlState.dsId);

  /**
   * When the URL has `sql`, it wins — do not restore `ds` / cols from URL.
   */
  const restoreStructuredFromURL = !urlState.rawSQL;

  const isDatasetSource = useMemo(() => {
    return (
      Boolean(restoredDataSource) &&
      (datasets?.some((d) => {
        return d.id === restoredDataSource?.id;
      }) ??
        false)
    );
  }, [restoredDataSource, datasets]);

  const isEntityConfigSource = useMemo(() => {
    return (
      Boolean(restoredDataSource) &&
      (entityConfigs?.some((e) => {
        return e.id === restoredDataSource?.id;
      }) ??
        false)
    );
  }, [restoredDataSource, entityConfigs]);

  const [datasetColumns] = DatasetColumnClient.useGetAll({
    ...where("dataset_id", "eq", restoredDataSource?.id),
    useQueryOptions: { enabled: needsColumns && isDatasetSource },
  });

  const [entityFieldConfigs] = EntityFieldConfigClient.useGetAll({
    ...where("entity_config_id", "eq", restoredDataSource?.id),
    useQueryOptions: { enabled: needsColumns && isEntityConfigSource },
  });

  const [isHydrated, setIsHydrated] = useState(false);

  // Decide once — on the very first render — whether we should hydrate from
  // the URL. Using a ref prevents dispatched state changes from re-triggering
  // the bail-out check mid-hydration (which would cause columns and viz config
  // to never be restored after setDataSource fires).
  const shouldHydrateRef = useRef<boolean | null>(null);
  if (shouldHydrateRef.current === null) {
    shouldHydrateRef.current =
      urlSearchHasHydrateableExplorerKeys(urlState) &&
      isDefaultExplorerState(state);
  }

  useEffect(() => {
    if (isHydrated) {
      return;
    }

    if (!shouldHydrateRef.current) {
      setIsHydrated(true);
      return;
    }

    if (
      shouldDeferURLHydrationForStructuredLoading({
        urlState,
        restoredDataSource,
        needsColumns,
        datasetColumns,
        entityFieldConfigs,
      })
    ) {
      return;
    }

    if (restoreStructuredFromURL && restoredDataSource) {
      dispatch.setDataSource(restoredDataSource);
    }

    if (
      restoreStructuredFromURL &&
      needsColumns &&
      (datasetColumns ?? entityFieldConfigs)
    ) {
      const allQueryColumns = [
        ...(datasetColumns ?? []).map((col) => {
          return QueryColumn.makeFromDatasetColumn(col);
        }),
        ...(entityFieldConfigs ?? []).map((col) => {
          return QueryColumn.makeFromEntityFieldConfig(col);
        }),
      ];

      const restoredCols = (urlState.colNames ?? [])
        .map((name) => {
          return allQueryColumns.find((col) => {
            return col.baseColumn.name === name;
          });
        })
        .filter(isNonNullish);

      if (restoredCols.length > 0) {
        dispatch.setColumns(restoredCols);

        if (urlState.aggregations) {
          restoredCols.forEach((col) => {
            const agg = urlState.aggregations?.[col.baseColumn.name];
            if (agg) {
              dispatch.setColumnAggregation({
                columnId: col.id,
                aggregation: agg,
              });
            }
          });
        }

        if (urlState.orderByColName) {
          const orderCol = restoredCols.find((col) => {
            return col.baseColumn.name === urlState.orderByColName;
          });
          if (orderCol) {
            dispatch.setOrderByColumn(orderCol.id);
            if (urlState.orderDir) {
              dispatch.setOrderByDirection(urlState.orderDir);
            }
          }
        }
      }
    }

    if (urlState.rawSQL) {
      dispatch.setRawSQL(urlState.rawSQL);
    }

    if (urlState.openDataset) {
      dispatch.setOpenDataset(urlState.openDataset);
    }

    // Restore viz config last — may overwrite the result of hydrateFromQuery
    // that setColumns triggered above.
    if (urlState.vizConfig) {
      dispatch.setVizConfig(urlState.vizConfig);
    }

    setIsHydrated(true);
    // Intentionally omitting `state` from deps: the "should hydrate?" decision
    // is captured once via shouldHydrateRef so that mid-hydration state changes
    // (from the dispatches above) do not re-trigger the bail-out check.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isHydrated,
    urlState,
    restoredDataSource,
    datasetColumns,
    entityFieldConfigs,
    needsColumns,
    dispatch,
  ]);

  // Sync state → URL on every state change, after hydration completes.
  const urlParams = useMemo(() => {
    return serializeStateToURL(state);
  }, [state]);
  const lastSyncedRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }
    const serialized = JSON.stringify(urlParams);
    if (serialized === lastSyncedRef.current) {
      return;
    }
    lastSyncedRef.current = serialized;
    navigate({ search: urlParams, replace: true });
  }, [isHydrated, urlParams, navigate]);
}
