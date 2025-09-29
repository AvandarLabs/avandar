import React, { useCallback, useMemo, useState } from "react";
import { notifyError } from "@/lib/ui/notifications/notifyError";
import { makeDefaultVizConfig } from "../VizSettingsForm/makeDefaultVizConfig";
import { DataExplorerContext } from "./context";
import type { VizConfig } from "../VizSettingsForm/makeDefaultVizConfig";
import type {
  DataExplorerContextType,
  DataExplorerContextTypeValues,
  OrderByDirection,
} from "./types";
import type { DatasetId } from "@/models/datasets/Dataset";
import type { DatasetColumn } from "@/models/datasets/DatasetColumn";

const DEFAULTS: DataExplorerContextTypeValues = {
  aggregations: {},
  selectedDatasetId: undefined,
  selectedColumns: [],
  selectedGroupByColumns: [],
  orderByColumn: undefined,
  orderByDirection: null,
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
  const [orderByDirection, setOrderByDirection] = useState<OrderByDirection>(
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
        const hasData = selectedColumns.length > 0;

        if (hasData) {
          notifyError({
            title: "Create Data Profile",
            message: "Create a Data Profile to visualize merged data.",
          });
        }

        reset();
      }

      setSelectedDatasetId(newValue);
    },
    [selectedDatasetId, selectedColumns, reset],
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
