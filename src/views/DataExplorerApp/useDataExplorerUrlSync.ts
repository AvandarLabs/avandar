import { where } from "@avandar/utils";
import { useEffect, useMemo, useRef, useState } from "react";
import { sqlToStructuredQuery } from "$/models/queries/StructuredQuery/sqlToStructuredQuery/sqlToStructuredQuery";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { ConceptAttributeClient } from "@/clients/ontology/ConceptAttributeClient";
import { ConceptClient } from "@/clients/ontology/ConceptClient";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { DataExplorerStateManager } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";
import {
  shouldDeferUrlHydrationForStructuredLoading,
  urlSearchHasHydrateableExplorerKeys,
} from "@/views/DataExplorerApp/dataExplorerUrlHydration/dataExplorerUrlHydration";
import {
  areExplorerUrlSearchParamsEqual,
  EMPTY_EXPLORER_URL_SEARCH,
  isDefaultExplorerState,
  parseUrlSearch,
  serializeStateToUrl,
} from "@/views/DataExplorerApp/DataExplorerUrlState";
import { getRestoredColumnsFromUrl } from "@/views/DataExplorerApp/getRestoredColumnsFromUrl/getRestoredColumnsFromUrl";
import { buildSqlMappingDatasets } from "@/views/DataExplorerApp/QueryForm/buildSqlMappingDatasets";
import { buildDataSourceCommitOptions } from "@/views/DataExplorerApp/resolveManualQueryForExecution/resolveManualQueryForExecution";
import type { DataExplorerUrlSearch } from "@/views/DataExplorerApp/DataExplorerUrlState";

type Options = {
  urlSearch: DataExplorerUrlSearch;
  navigate: (options: {
    search: DataExplorerUrlSearch;
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
 *   dataset) is applied: `ds` and `cols` are ignored so a stale Manual Query
 *   cannot block restore or conflict with the SQL text. The SQL is parsed with
 *   `sqlToStructuredQuery` once workspace dataset metadata has loaded so the
 *   Manual Query form is prefilled. Column objects are re-fetched via TanStack
 *   Query (cached) and matched by `baseColumn.name` when structured params are
 *   used.
 *
 * - **Persistence (state → URL):** After hydration is complete, every state
 *   change is serialised back to the URL using `replace: true` so the browser
 *   history stays clean. Failed queries do not write `sql` to the URL; once a
 *   bad `?sql=` link errors, the param is removed so refresh does not loop.
 */
export function useDataExplorerUrlSync({ urlSearch, navigate }: Options): void {
  const state = DataExplorerStateManager.useState();
  const dispatch = DataExplorerStateManager.useDispatch();
  const workspace = useCurrentWorkspace();

  const urlState = useMemo(() => {
    return parseUrlSearch(urlSearch);
  }, [urlSearch]);

  // Data source lookup. These are already fetched by QueryDataSourceSelect
  // so TanStack Query will return cached results with no extra network call.
  const [datasets] = DatasetClient.useGetAll(
    where("workspace_id", "eq", workspace.id),
  );
  const [concepts] = ConceptClient.useGetAll(
    where("workspace_id", "eq", workspace.id),
  );

  const restoredDataSource = useMemo(() => {
    if (!urlState.dsId) {
      return undefined;
    }
    return [...(datasets ?? []), ...(concepts ?? [])].find((ds) => {
      return ds.id === urlState.dsId;
    });
  }, [urlState.dsId, datasets, concepts]);

  const needsColumns =
    (urlState.colNames?.length ?? 0) > 0 && Boolean(urlState.dsId);

  /**
   * When the URL has `sql`, it wins: do not restore `ds` / cols from URL.
   */
  const restoreStructuredFromUrl = !urlState.rawSql;

  const isDatasetSource = useMemo(() => {
    return (
      Boolean(restoredDataSource) &&
      (datasets?.some((d) => {
        return d.id === restoredDataSource?.id;
      }) ??
        false)
    );
  }, [restoredDataSource, datasets]);

  const isConceptSource = useMemo(() => {
    return (
      Boolean(restoredDataSource) &&
      (concepts?.some((e) => {
        return e.id === restoredDataSource?.id;
      }) ??
        false)
    );
  }, [restoredDataSource, concepts]);

  const [datasetColumns] = DatasetColumnClient.useGetAll({
    ...where("dataset_id", "eq", restoredDataSource?.id),
    useQueryOptions: { enabled: needsColumns && isDatasetSource },
  });

  const [conceptAttributes] = ConceptAttributeClient.useGetAll({
    ...where("concept_id", "eq", restoredDataSource?.id),
    useQueryOptions: { enabled: needsColumns && isConceptSource },
  });

  const [allDatasetColumns] = DatasetColumnClient.useGetAll(
    where("workspace_id", "eq", workspace.id),
  );

  const sqlMappingMetadataLoaded =
    datasets !== undefined && allDatasetColumns !== undefined;

  const [isHydrated, setIsHydrated] = useState(false);

  // Decide once, on the very first render, whether we should hydrate from
  // the URL. Using a ref prevents dispatched state changes from re-triggering
  // the bail-out check mid-hydration (which would cause columns and viz config
  // to never be restored after setDataSource fires).
  const shouldHydrateRef = useRef<boolean | null>(null);
  if (shouldHydrateRef.current === null) {
    shouldHydrateRef.current =
      urlSearchHasHydrateableExplorerKeys(urlState) &&
      isDefaultExplorerState(state);
  }

  useEffect(
    function hydrateStateFromUrl() {
      if (isHydrated) {
        return;
      }

      if (!shouldHydrateRef.current) {
        setIsHydrated(true);
        return;
      }

      if (
        shouldDeferUrlHydrationForStructuredLoading({
          urlState,
          restoredDataSource,
          needsColumns,
          datasetColumns,
          conceptAttributes,
          sqlMappingMetadataLoaded,
        })
      ) {
        return;
      }

      // Cleared on unmount so the row-count lookup below cannot dispatch into
      // an unmounted tree. It is checked once, immediately after the only
      // suspension point, rather than before each dispatch: everything from
      // there on is synchronous, so no later dispatch can outlive this check.
      let isEffectActive = true;

      void (async () => {
        if (restoreStructuredFromUrl && restoredDataSource) {
          // Every dispatch below has to stay in one synchronous run. The
          // trigger stamp at the end of this block explains why, and an
          // `await` between here and there silently relabels every hydrated
          // query.
          //
          // `async-defer-await` wants cheap guards hoisted above the await so
          // discarded work is never started. The only guard here reads
          // `isEffectActive`, which is unconditionally true until this await
          // yields, so hoisting it would check nothing. False positive.
          //
          // `react-doctor-disable-next-line` takes no rule name, so this
          // suppresses every rule on the next line. Keep the line it guards to
          // the single `const commitOptions` declaration.
          // react-doctor-disable-next-line
          const commitOptions = isDatasetSource
            ? await buildDataSourceCommitOptions({
                dataSource: restoredDataSource,
                query: state.query,
                workspaceId: workspace.id,
              })
            : undefined;
          if (!isEffectActive) {
            return;
          }
          dispatch.setDataSource({
            dataSource: restoredDataSource,
            options: commitOptions,
          });
        }

        if (
          restoreStructuredFromUrl &&
          needsColumns &&
          (datasetColumns ?? conceptAttributes)
        ) {
          const restoredCols = getRestoredColumnsFromUrl({
            colNames: urlState.colNames,
            datasetColumns,
            conceptAttributes,
          });

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

        if (urlState.rawSql) {
          dispatch.setRawSql(urlState.rawSql);
          const mapping = sqlToStructuredQuery({
            sql: urlState.rawSql,
            datasets: buildSqlMappingDatasets(
              datasets ?? [],
              allDatasetColumns ?? [],
            ),
          });
          dispatch.applySqlMapping({
            query: mapping.query,
            isFullyMapped: mapping.isFullyMapped,
            unmappedReasons: mapping.unmappedReasons,
          });
        }

        if (urlState.openDataset) {
          dispatch.setOpenDataset(urlState.openDataset);
        }

        // Restore viz config last: may overwrite the result of
        // hydrateFromQuery that setColumns triggered above.
        if (urlState.vizConfig) {
          dispatch.setVizConfig(urlState.vizConfig);
        }

        // Stamped last on purpose. Stamping earlier would not survive: the
        // structured restores above route through the manual-form reducer,
        // which stamps `structured_change` itself.
        //
        // This works only because every dispatch above runs synchronously in
        // this block, so React coalesces them into one render and no query
        // observes an intermediate trigger. Do not introduce an `await`
        // between the first dispatch and this line. A render could then commit
        // mid-hydration, and every hydrated query would silently report
        // `structured_change` instead. If suspending here ever becomes
        // necessary, the trigger has to move into the query-changing action
        // payloads rather than being stamped separately.
        dispatch.setQueryTrigger("url_hydration");

        setIsHydrated(true);
      })();

      return () => {
        isEffectActive = false;
      };
    },
    // Intentionally omitting `state` from deps: the "should hydrate?"
    // decision is captured once via shouldHydrateRef so that mid-hydration
    // state changes (from the dispatches above) do not re-trigger the
    // bail-out check.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      isHydrated,
      urlState,
      restoredDataSource,
      datasetColumns,
      conceptAttributes,
      needsColumns,
      datasets,
      allDatasetColumns,
      sqlMappingMetadataLoaded,
      dispatch,
    ],
  );

  // Sync state → URL on every state change, after hydration completes.
  const urlParams = useMemo(() => {
    return serializeStateToUrl(state);
  }, [state]);
  const lastSyncedRef = useRef<string | undefined>(undefined);

  useEffect(
    function syncUrlFromState() {
      if (!isHydrated) {
        return;
      }
      const serialized = JSON.stringify(urlParams);
      if (serialized === lastSyncedRef.current) {
        return;
      }
      if (areExplorerUrlSearchParamsEqual(urlSearch, urlParams)) {
        lastSyncedRef.current = serialized;
        return;
      }
      lastSyncedRef.current = serialized;
      const searchToWrite =
        Object.keys(urlParams).length === 0
          ? EMPTY_EXPLORER_URL_SEARCH
          : urlParams;
      navigate({ search: searchToWrite, replace: true });
    },
    [isHydrated, urlParams, urlSearch, navigate],
  );
}
