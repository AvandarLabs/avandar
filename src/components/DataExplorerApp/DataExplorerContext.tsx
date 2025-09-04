import React, { createContext, useCallback, useMemo, useState } from "react";
import { makeDefaultVizConfig } from "./VizSettingsForm/makeDefaultVizConfig";
import type { VizConfig } from "./VizSettingsForm/makeDefaultVizConfig";
import type { QueryAggregationType } from "@/clients/LocalDatasetQueryClient";
import type { DatasetId } from "@/models/datasets/Dataset";
import type { DatasetColumn } from "@/models/datasets/DatasetColumn";

export type DataExplorerContextType = {
  aggregations: Record<string, QueryAggregationType>;
  selectedDatasetId?: DatasetId;
  selectedColumns: readonly DatasetColumn[];
  selectedGroupByColumns: readonly DatasetColumn[];
  orderByColumn?: DatasetColumn;
  orderByDirection: "asc" | "desc";
  vizConfig: VizConfig;
  setAggregations: (agg: Record<string, QueryAggregationType>) => void;
  setSelectedDatasetId: (id: DatasetId | undefined) => void;
  setSelectedColumns: (cols: readonly DatasetColumn[]) => void;
  setSelectedGroupByColumns: (cols: readonly DatasetColumn[]) => void;
  setOrderByColumn: (col: DatasetColumn | undefined) => void;
  setOrderByDirection: (dir: "asc" | "desc") => void;
  setVizConfig: (vc: VizConfig) => void;
  onSelectDatasetChange: (id: DatasetId | undefined) => void;
  reset: () => void;
};

// eslint-disable-next-line react-refresh/only-export-components
export const DataExplorerContext =
  createContext<DataExplorerContextType | null>(null);

const DEFAULTS: Omit<
  DataExplorerContextType,
  | "setAggregations"
  | "setSelectedDatasetId"
  | "setSelectedColumns"
  | "setSelectedGroupByColumns"
  | "setOrderByColumn"
  | "setOrderByDirection"
  | "setVizConfig"
  | "onSelectDatasetChange"
  | "reset"
> = {
  aggregations: {},
  selectedDatasetId: undefined,
  selectedColumns: [],
  selectedGroupByColumns: [],
  orderByColumn: undefined,
  orderByDirection: "asc",
  vizConfig: makeDefaultVizConfig("table"),
};

export function DataExplorerProvider({
  children,
}: {
  children: React.ReactNode;
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

  const onSelectDatasetChange = useCallback(
    (id: DatasetId | undefined) => {
      if (id !== selectedDatasetId) {
        reset();
      }
      setSelectedDatasetId(id);
    },
    [selectedDatasetId, reset],
  );

  const value = useMemo(() => {
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
      onSelectDatasetChange,
      reset,
    } satisfies DataExplorerContextType;
  }, [
    aggregations,
    selectedDatasetId,
    selectedColumns,
    selectedGroupByColumns,
    orderByColumn,
    orderByDirection,
    vizConfig,
    onSelectDatasetChange,
    reset,
  ]);

  return (
    <DataExplorerContext.Provider value={value}>
      {children}
    </DataExplorerContext.Provider>
  );
}
