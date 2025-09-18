import React, { useCallback, useMemo, useState } from "react";
import { isInSet } from "@/lib/utils/sets/higherOrderFuncs";
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
  const [selectedColumns, rawSetSelectedColumns] = useState<
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
    rawSetSelectedColumns(DEFAULTS.selectedColumns);
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

  const applySelectedColumns = useCallback(
    (updatedColumns: readonly DatasetColumn[]) => {
      const updatedNames = new Set(
        updatedColumns.map((column) => {
          return column.name;
        }),
      );

      rawSetSelectedColumns(updatedColumns);

      if (updatedColumns.length === 0) {
        setAggregations({});
        setSelectedGroupByColumns([]);
        setOrderByColumn(undefined);
        setOrderByDirection("asc");
        setVizConfig(makeDefaultVizConfig("table"));
        return;
      }

      setSelectedGroupByColumns((groupByColumns) => {
        return groupByColumns.filter((col) => {
          return isInSet(updatedNames)(col.name);
        });
      });

      setAggregations((currentAggs) => {
        const nextAggs: Record<string, QueryAggregationType> = {};
        updatedColumns.forEach((col) => {
          nextAggs[col.name] = currentAggs[col.name] ?? "none";
        });
        return nextAggs;
      });

      setOrderByColumn((currentOrderBy) => {
        return currentOrderBy && updatedNames.has(currentOrderBy.name) ?
            currentOrderBy
          : undefined;
      });
    },
    [],
  );

  const value = useMemo<DataExplorerContextType>(() => {
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
      setSelectedColumns: applySelectedColumns,
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
    applySelectedColumns,
    reset,
  ]);

  return (
    <DataExplorerContext.Provider value={value}>
      {children}
    </DataExplorerContext.Provider>
  );
}
