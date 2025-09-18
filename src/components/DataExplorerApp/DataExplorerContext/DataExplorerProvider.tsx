import React, { useCallback, useMemo, useState } from "react";
import { makeDefaultVizConfig } from "../VizSettingsForm/makeDefaultVizConfig";
import { DataExplorerContext } from "./context";
import type { VizConfig } from "../VizSettingsForm/makeDefaultVizConfig";
import type {
  DataExplorerContextType,
  DataExplorerContextTypeValues,
} from "./types";
import type { DatasetId } from "@/models/datasets/Dataset";
import type { DatasetColumn } from "@/models/datasets/DatasetColumn";

const DEFAULTS: DataExplorerContextTypeValues = {
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

  const onSelectDatasetChange = useCallback(
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
      onSelectDatasetChange,
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
    onSelectDatasetChange,
    reset,
  ]);

  return (
    <DataExplorerContext.Provider value={value}>
      {children}
    </DataExplorerContext.Provider>
  );
}
