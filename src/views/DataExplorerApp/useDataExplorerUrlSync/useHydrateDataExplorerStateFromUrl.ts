import { isNonNullish, propEq, where } from "@utils";
import { DatasetId } from "$/models/datasets/Dataset/Dataset.types";
import { EntityConfigId } from "$/models/EntityConfig/EntityConfig.types";
import { QueryAggregationType } from "$/models/queries/QueryAggregationType/QueryAggregationType";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { OrderByDirection } from "$/models/queries/StructuredQuery/StructuredQuery.types";
import { VizConfig } from "$/models/vizs/VizConfig/VizConfig.types";
import { useEffect, useRef, useState } from "react";
import { DatasetClient } from "@/clients/datasets/DatasetClient";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { EntityFieldConfigClient } from "@/clients/entities/EntityFieldConfigClient";
import { EntityConfigClient } from "@/clients/entity-configs/EntityConfigClient";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import {
  DataExplorerAppState,
  OpenDatasetInfo,
} from "../DataExplorerStateManager/DataExplorerAppState.types";
import { DataExplorerStateManager } from "../DataExplorerStateManager/DataExplorerStateManager";

export type DataExplorerUrlState = {
  dsId?: string;
  colNames?: readonly string[];
  aggregations?: Readonly<Record<string, QueryAggregationType.T>>;
  orderByColName?: string;
  orderDir?: OrderByDirection;
  rawSql?: string;
  vizConfig?: VizConfig;
  openDataset?: OpenDatasetInfo;
};

/**
 * Returns `true` when the Data Explorer state has not yet been modified from
 * its initial blank state (no data source, no columns, no raw SQL).
 */
export function _isDefaultExplorerState({
  query,
  rawSQL,
}: DataExplorerAppState): boolean {
  return (
    query.dataSource === undefined &&
    query.queryColumns.length === 0 &&
    rawSQL === undefined
  );
}

/**
 * Returns true when the parsed URL carries at least one explorer key we may
 * hydrate (`ds`, `sql`, or `vc`). Used with `isDefaultExplorerState` to decide
 * first-mount hydration.
 */
function _urlSearchHasHydrateableExplorerKeys(
  urlState: DataExplorerUrlState,
): boolean {
  return (
    (urlState.dsId !== undefined && urlState.dsId !== "") ||
    (urlState.rawSql !== undefined && urlState.rawSql !== "") ||
    urlState.vizConfig !== undefined
  );
}

/**
 * Hydrates the Data Explorer state from the URL search params.
 * @param initialUrlState - The initial URL state.
 * @returns { isHydrated: boolean } - Whether the Data Explorer state has been
 * hydrated from the URL.
 */
export function useHydrateDataExplorerStateFromUrl({
  initialUrlState,
}: {
  initialUrlState: DataExplorerUrlState;
}): { isHydrated: boolean } {
  const appState = DataExplorerStateManager.useState();
  const dispatch = DataExplorerStateManager.useDispatch();
  const workspace = useCurrentWorkspace();

  // Decide once (on the very first render) whether we should hydrate from
  // the URL. Using a ref prevents dispatched state changes from re-triggering
  // the bail-out check mid-hydration (which would cause columns and viz config
  // to never be restored after setDataSource fires).
  const shouldHydrateRef = useRef<boolean>(
    _urlSearchHasHydrateableExplorerKeys(initialUrlState) &&
      _isDefaultExplorerState(appState),
  );

  const [isHydrated, setIsHydrated] = useState(
    // if we should not hydrate, then we initialize `isHydrated` to `true`
    // to avoid potential hydration from accidentally happening
    !shouldHydrateRef.current,
  );

  // Data source lookup — these are already fetched by QueryDataSourceSelect
  // so TanStack Query will return cached results with no extra network call.
  const [datasets = []] = DatasetClient.useGetAll(
    where("workspace_id", "eq", workspace.id),
  );
  const [entityConfigs = []] = EntityConfigClient.useGetAll(
    where("workspace_id", "eq", workspace.id),
  );

  // the data source that was hydrated from the URL
  const hydratedDataSource =
    initialUrlState.dsId ?
      [...datasets, ...entityConfigs].find(
        propEq("id", initialUrlState.dsId as DatasetId | EntityConfigId),
      )
    : undefined;

  const isDatasetSource =
    !!hydratedDataSource &&
    datasets.some(propEq("id", hydratedDataSource.id as DatasetId));

  const isEntityConfigSource =
    !!hydratedDataSource &&
    entityConfigs.some(propEq("id", hydratedDataSource.id as EntityConfigId));

  const needsColumns =
    (initialUrlState.colNames?.length ?? 0) > 0 &&
    initialUrlState.dsId !== undefined &&
    initialUrlState.dsId !== "";

  const [datasetColumns] = DatasetColumnClient.useGetAll({
    ...where("dataset_id", "eq", hydratedDataSource?.id),
    useQueryOptions: { enabled: needsColumns && isDatasetSource },
  });

  const [entityFieldConfigs] = EntityFieldConfigClient.useGetAll({
    ...where("entity_config_id", "eq", hydratedDataSource?.id),
    useQueryOptions: { enabled: needsColumns && isEntityConfigSource },
  });

  useEffect(
    function hydrateDataExplorerStateFromUrl() {
      if (isHydrated || !shouldHydrateRef.current) {
        return;
      }

      // if the URL does not have rawSQL then we try and restore a structured
      // query by checking if the URL has each individual part of a structured
      // query
      const shouldRestoreStructuredQueryFromUrl = !initialUrlState.rawSql;
      if (shouldRestoreStructuredQueryFromUrl) {
        if (hydratedDataSource) {
          dispatch.setDataSource(hydratedDataSource);
        }

        if (needsColumns && (datasetColumns || entityFieldConfigs)) {
          const allQueryColumns = [
            ...(datasetColumns ?? []).map(QueryColumn.makeFromDatasetColumn),
            ...(entityFieldConfigs ?? []).map(
              QueryColumn.makeFromEntityFieldConfig,
            ),
          ];

          const hydratedColumns = (initialUrlState.colNames ?? [])
            .map((name) => {
              return allQueryColumns.find(propEq("baseColumn.name", name));
            })
            .filter(isNonNullish);

          if (hydratedColumns.length > 0) {
            dispatch.setColumns(hydratedColumns);

            if (initialUrlState.aggregations) {
              hydratedColumns.forEach((col) => {
                const aggType =
                  initialUrlState.aggregations?.[col.baseColumn.name];
                if (aggType) {
                  dispatch.setColumnAggregation({
                    columnId: col.id,
                    aggregation: aggType,
                  });
                }
              });
            }

            if (initialUrlState.orderByColName) {
              const orderCol = hydratedColumns.find(
                propEq("baseColumn.name", initialUrlState.orderByColName),
              );
              if (orderCol) {
                dispatch.setOrderByColumn(orderCol.id);
                if (initialUrlState.orderDir) {
                  dispatch.setOrderByDirection(initialUrlState.orderDir);
                }
              }
            }
          }
        }
      }

      if (initialUrlState.rawSql) {
        dispatch.setRawSql(initialUrlState.rawSql);
      }

      if (initialUrlState.openDataset) {
        dispatch.setOpenDataset(initialUrlState.openDataset);
      }

      if (initialUrlState.vizConfig) {
        dispatch.setVizConfig(initialUrlState.vizConfig);
      }

      setIsHydrated(true);
    },
    [
      isHydrated,
      hydratedDataSource,
      needsColumns,
      datasetColumns,
      entityFieldConfigs,
      dispatch,
      initialUrlState,
    ],
  );

  return { isHydrated };
}
