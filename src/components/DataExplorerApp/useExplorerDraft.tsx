import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { makeDefaultVizConfig } from "./VizSettingsForm/makeDefaultVizConfig";
import type { VizConfig } from "./VizSettingsForm/makeDefaultVizConfig";
import type { QueryAggregationType } from "@/clients/LocalDatasetQueryClient";
import type { DatasetId } from "@/models/datasets/Dataset";
import type { DatasetColumn } from "@/models/datasets/DatasetColumn";

export type UseExplorerDraftReturn = {
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

  reset: () => void;
};

type ExplorerDraft = {
  aggregations: Record<string, QueryAggregationType>;
  selectedDatasetId?: DatasetId;
  selectedColumns: readonly DatasetColumn[];
  selectedGroupByColumns: readonly DatasetColumn[];
  orderByColumn?: DatasetColumn;
  orderByDirection: "asc" | "desc";
  vizConfig: VizConfig;
};

const DEFAULTS: ExplorerDraft = {
  aggregations: {},
  selectedDatasetId: undefined,
  selectedColumns: [],
  selectedGroupByColumns: [],
  orderByColumn: undefined,
  orderByDirection: "asc",
  vizConfig: makeDefaultVizConfig("table"),
};

const DRAFT_KEY = ["data-explorer", "draft"] as const;

export function useExplorerDraft(): UseExplorerDraftReturn {
  const qc = useQueryClient();

  // subscribe to the draft
  const { data: draft = DEFAULTS } = useQuery({
    queryKey: DRAFT_KEY,
    queryFn: async () => {
      return DEFAULTS;
    },
    initialData: DEFAULTS,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const patch = useCallback(
    (update: Partial<ExplorerDraft>) => {
      qc.setQueryData<ExplorerDraft>(DRAFT_KEY, (prev = DEFAULTS) => {
        return { ...prev, ...update };
      });
    },
    [qc],
  );

  const setAggregations = useCallback(
    (agg: ExplorerDraft["aggregations"]) => {
      return patch({ aggregations: agg });
    },
    [patch],
  );

  const setSelectedDatasetId = useCallback(
    (id: DatasetId | undefined) => {
      return patch({ selectedDatasetId: id });
    },
    [patch],
  );

  const setSelectedColumns = useCallback(
    (cols: readonly DatasetColumn[]) => {
      return patch({ selectedColumns: cols });
    },
    [patch],
  );

  const setSelectedGroupByColumns = useCallback(
    (cols: readonly DatasetColumn[]) => {
      return patch({ selectedGroupByColumns: cols });
    },
    [patch],
  );

  const setOrderByColumn = useCallback(
    (col: DatasetColumn | undefined) => {
      return patch({ orderByColumn: col });
    },
    [patch],
  );

  const setOrderByDirection = useCallback(
    (dir: "asc" | "desc") => {
      return patch({ orderByDirection: dir });
    },
    [patch],
  );

  const setVizConfig = useCallback(
    (vc: VizConfig) => {
      return patch({ vizConfig: vc });
    },
    [patch],
  );

  const reset = useCallback(() => {
    return qc.setQueryData<ExplorerDraft>(DRAFT_KEY, DEFAULTS);
  }, [qc]);

  return useMemo(() => {
    return {
      aggregations: draft.aggregations,
      selectedDatasetId: draft.selectedDatasetId,
      selectedColumns: draft.selectedColumns,
      selectedGroupByColumns: draft.selectedGroupByColumns,
      orderByColumn: draft.orderByColumn,
      orderByDirection: draft.orderByDirection,
      vizConfig: draft.vizConfig,

      setAggregations,
      setSelectedDatasetId,
      setSelectedColumns,
      setSelectedGroupByColumns,
      setOrderByColumn,
      setOrderByDirection,
      setVizConfig,

      reset,
    };
  }, [
    draft,
    setAggregations,
    setSelectedDatasetId,
    setSelectedColumns,
    setSelectedGroupByColumns,
    setOrderByColumn,
    setOrderByDirection,
    setVizConfig,
    reset,
  ]);
}
