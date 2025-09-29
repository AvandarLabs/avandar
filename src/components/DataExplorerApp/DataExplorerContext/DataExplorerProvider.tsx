import React, { useCallback, useMemo, useState } from "react";
import { QueryableColumn } from "../QueryableColumnMultiSelect";
import { QueryableDataSource } from "../QueryableDataSourceSelect";
import { makeDefaultVizConfig } from "../VizSettingsForm/makeDefaultVizConfig";
import { DataExplorerContext } from "./context";
import type { VizConfig } from "../VizSettingsForm/makeDefaultVizConfig";
import type {
  DataExplorerContextType,
  DataExplorerContextTypeValues,
} from "./types";

const DEFAULTS: DataExplorerContextTypeValues = {
  aggregations: {},
  selectedDataSource: undefined,
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
  const [selectedDataSource, setSelectedDataSource] = useState<
    QueryableDataSource | undefined
  >(DEFAULTS.selectedDataSource);
  const [selectedColumns, setSelectedColumns] = useState<
    readonly QueryableColumn[]
  >(DEFAULTS.selectedColumns);
  const [selectedGroupByColumns, setSelectedGroupByColumns] = useState<
    readonly QueryableColumn[]
  >(DEFAULTS.selectedGroupByColumns);
  const [orderByColumn, setOrderByColumn] = useState<
    QueryableColumn | undefined
  >(DEFAULTS.orderByColumn);
  const [orderByDirection, setOrderByDirection] = useState<"asc" | "desc">(
    DEFAULTS.orderByDirection,
  );
  const [vizConfig, setVizConfig] = useState<VizConfig>(DEFAULTS.vizConfig);

  const reset = useCallback(() => {
    setAggregations(DEFAULTS.aggregations);
    setSelectedDataSource(DEFAULTS.selectedDataSource);
    setSelectedColumns(DEFAULTS.selectedColumns);
    setSelectedGroupByColumns(DEFAULTS.selectedGroupByColumns);
    setOrderByColumn(DEFAULTS.orderByColumn);
    setOrderByDirection(DEFAULTS.orderByDirection);
    setVizConfig(makeDefaultVizConfig("table"));
  }, []);

  const onSelectedDataSourceChange = useCallback(
    (newValue: QueryableDataSource | undefined) => {
      if (newValue !== selectedDataSource) {
        reset();
      }
      setSelectedDataSource(newValue);
    },
    [selectedDataSource, reset],
  );

  const value = useMemo((): DataExplorerContextType => {
    return {
      aggregations,
      selectedDataSource: selectedDataSource,
      selectedColumns,
      selectedGroupByColumns,
      orderByColumn,
      orderByDirection,
      vizConfig,
      setAggregations,
      setSelectedDataSource: setSelectedDataSource,
      setSelectedColumns,
      setSelectedGroupByColumns,
      setOrderByColumn,
      setOrderByDirection,
      setVizConfig,
      onSelectedDataSourceChange,
      reset,
    };
  }, [
    aggregations,
    selectedDataSource,
    selectedColumns,
    selectedGroupByColumns,
    orderByColumn,
    orderByDirection,
    vizConfig,
    onSelectedDataSourceChange,
    reset,
  ]);

  return (
    <DataExplorerContext.Provider value={value}>
      {children}
    </DataExplorerContext.Provider>
  );
}
