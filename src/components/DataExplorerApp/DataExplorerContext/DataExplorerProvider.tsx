import React, { useCallback, useMemo, useState } from "react";
import { makeDefaultVizConfig } from "../VizSettingsForm/makeDefaultVizConfig";
import { DataExplorerContext } from "./context";
import type {
  DataExplorerContextType,
  DataExplorerContextTypeValues,
} from "./types";
import type { DatasetId } from "@/models/datasets/Dataset";

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
  const [formStates, setFormStates] = useState<
    Record<string, DataExplorerContextTypeValues>
  >({});

  const [selectedDatasetId, setSelectedDatasetId] = useState<
    DatasetId | undefined
  >(undefined);

  // Always return a fully-populated state
  const currentFormState: DataExplorerContextTypeValues = useMemo(() => {
    if (selectedDatasetId && formStates[selectedDatasetId]) {
      return formStates[selectedDatasetId];
    }
    return {
      ...DEFAULTS,
      selectedDatasetId,
    };
  }, [selectedDatasetId, formStates]);

  // helper to update dataset-specific state
  const updateFormState = useCallback(
    (partial: Partial<DataExplorerContextTypeValues>) => {
      if (!selectedDatasetId) return;
      setFormStates((prevSelectedDatasetId) => {
        const prevState = prevSelectedDatasetId[selectedDatasetId] ?? {
          ...DEFAULTS,
          selectedDatasetId,
        };
        return {
          ...prevSelectedDatasetId,
          [selectedDatasetId]: {
            ...prevState,
            ...partial,
          },
        };
      });
    },
    [selectedDatasetId],
  );

  const onSelectDatasetChange = useCallback(
    (newValue: DatasetId | undefined) => {
      if (newValue === selectedDatasetId) return;
      setSelectedDatasetId(newValue);
    },
    [selectedDatasetId],
  );

  const reset = useCallback(() => {
    if (!selectedDatasetId) return;
    setFormStates((previousSelectedDatasetId) => {
      return {
        ...previousSelectedDatasetId,
        [selectedDatasetId]: {
          ...DEFAULTS,
          selectedDatasetId,
        },
      };
    });
  }, [selectedDatasetId]);

  const value = useMemo((): DataExplorerContextType => {
    return {
      ...currentFormState,
      selectedDatasetId,
      setAggregations: (newAggregations) => {
        return updateFormState({ aggregations: newAggregations });
      },
      setSelectedColumns: (newColumns) => {
        return updateFormState({ selectedColumns: newColumns });
      },
      setSelectedGroupByColumns: (newGroupBycolumns) => {
        return updateFormState({ selectedGroupByColumns: newGroupBycolumns });
      },
      setOrderByColumn: (newOrderByColumn) => {
        return updateFormState({ orderByColumn: newOrderByColumn });
      },
      setOrderByDirection: (newOrderByColumn) => {
        return updateFormState({ orderByDirection: newOrderByColumn });
      },
      setVizConfig: (newVizConfig) => {
        return updateFormState({ vizConfig: newVizConfig });
      },
      setSelectedDatasetId,
      onSelectDatasetChange,
      reset,
    };
  }, [
    currentFormState,
    selectedDatasetId,
    updateFormState,
    onSelectDatasetChange,
    reset,
  ]);

  return (
    <DataExplorerContext.Provider value={value}>
      {children}
    </DataExplorerContext.Provider>
  );
}
