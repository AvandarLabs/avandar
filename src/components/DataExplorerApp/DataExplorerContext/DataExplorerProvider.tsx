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
  selectedFromDataSource: undefined,
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
  const [selectedFromDataSource, setSelectedFromDataSource] = useState<
    QueryableDataSource | undefined
  >(DEFAULTS.selectedFromDataSource);
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
    setSelectedFromDataSource(DEFAULTS.selectedFromDataSource);
    setSelectedColumns(DEFAULTS.selectedColumns);
    setSelectedGroupByColumns(DEFAULTS.selectedGroupByColumns);
    setOrderByColumn(DEFAULTS.orderByColumn);
    setOrderByDirection(DEFAULTS.orderByDirection);
    setVizConfig(makeDefaultVizConfig("table"));
  }, []);

  const _setSelectedFromDataSource = useCallback(
    (newFrom: QueryableDataSource | undefined) => {
      if (newFrom !== selectedFromDataSource) {
        reset();
      }
      setSelectedFromDataSource(newFrom);
    },
    [selectedFromDataSource, reset],
  );

  const value = useMemo((): DataExplorerContextType => {
    return {
      aggregations,
      selectedColumns,
      selectedFromDataSource,
      selectedGroupByColumns,
      orderByColumn,
      orderByDirection,
      vizConfig,
      setAggregations,
      setSelectedColumns,
      setSelectedFromDataSource: _setSelectedFromDataSource,
      setSelectedGroupByColumns,
      setOrderByColumn,
      setOrderByDirection,
      setVizConfig,
      reset,
    };
  }, [
    aggregations,
    selectedColumns,
    selectedFromDataSource,
    selectedGroupByColumns,
    orderByColumn,
    orderByDirection,
    vizConfig,
    reset,
    _setSelectedFromDataSource,
  ]);

  return (
    <DataExplorerContext.Provider value={value}>
      {children}
    </DataExplorerContext.Provider>
  );
}
