import React, { useCallback, useMemo, useState } from "react";
import { makeDefaultVizConfig } from "../VizSettingsForm/makeDefaultVizConfig";
import { DataExplorerContext } from "./context";
import type { VizConfig } from "../VizSettingsForm/makeDefaultVizConfig";
import type { DataExplorerContextType } from "./types";
import type { QueryAggregationType } from "@/clients/LocalDatasetQueryClient";
import type { DatasetId } from "@/models/datasets/Dataset";
import type { DatasetColumn } from "@/models/datasets/DatasetColumn";

const DEFAULTS = {
  aggregations: {} as Record<string, QueryAggregationType>,
  selectedDatasetId: undefined as DatasetId | undefined,
  selectedColumns: [] as readonly DatasetColumn[],
  selectedGroupByColumns: [] as readonly DatasetColumn[],
  orderByColumn: undefined as DatasetColumn | undefined,
  orderByDirection: "asc" as const,
  vizConfig: makeDefaultVizConfig("table") as VizConfig,
};

export function DataExplorerProvider({
  children,
}: {
  children?: React.ReactNode;
}): JSX.Element {
  const [aggregations, setAggregations] = useState(DEFAULTS.aggregations);
  const [selectedDatasetId, setSelectedDatasetId] = useState<
    DatasetId | undefined
  >(DEFAULTS.selectedDatasetId);
  const [selectedColumns, setSelectedColumns] = useState<
    readonly DatasetColumn[]
  >(DEFAULTS.selectedColumns);
  const [selectedGroupByColumns, setSelectedGroupByColumns] = useState<
    readonly DatasetColumn[]
  >(DEFAULTS.selectedGroupByColumns);
  const [orderByColumn, setOrderByColumn] = useState<DatasetColumn | undefined>(
    DEFAULTS.orderByColumn,
  );
  const [orderByDirection, setOrderByDirection] = useState<"asc" | "desc">(
    DEFAULTS.orderByDirection,
  );
  const [vizConfig, setVizConfig] = useState<VizConfig>(DEFAULTS.vizConfig);

  const reset = useCallback(() => {
    setAggregations(DEFAULTS.aggregations);
    setSelectedDatasetId(DEFAULTS.selectedDatasetId);
    setSelectedColumns(DEFAULTS.selectedColumns);
    setSelectedGroupByColumns(DEFAULTS.selectedGroupByColumns);
    setOrderByColumn(DEFAULTS.orderByColumn);
    setOrderByDirection(DEFAULTS.orderByDirection);
    setVizConfig(makeDefaultVizConfig("table"));
  }, []);

  const selectDataset = useCallback(
    (newValue: DatasetId | undefined) => {
      if (newValue !== selectedDatasetId) {
        reset();
      }
      setSelectedDatasetId(newValue);
    },
    [selectedDatasetId, reset],
  );

  const value = useMemo((): DataExplorerContextType => {
    return {
      aggregations,
      selectedDatasetId,
      selectedColumns,
      selectedGroupByColumns,
      orderByColumn,
      orderByDirection,
      vizConfig,
      setAggregations,
      setSelectedDatasetId,
      setSelectedColumns,
      setSelectedGroupByColumns,
      setOrderByColumn,
      setOrderByDirection,
      setVizConfig,
      selectDataset,
      reset,
    };
  }, [
    aggregations,
    selectedDatasetId,
    selectedColumns,
    selectedGroupByColumns,
    orderByColumn,
    orderByDirection,
    vizConfig,
    selectDataset,
    reset,
  ]);

  return (
    <DataExplorerContext.Provider value={value}>
      {children}
    </DataExplorerContext.Provider>
  );
}
