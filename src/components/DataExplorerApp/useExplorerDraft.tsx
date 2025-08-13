import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { makeDefaultVizConfig } from "./VizSettingsForm/makeDefaultVizConfig";
import type { VizConfig } from "./VizSettingsForm/makeDefaultVizConfig";
import type { QueryAggregationType } from "@/clients/LocalDatasetQueryClient";
import type { LocalDatasetField } from "@/models/LocalDataset/LocalDatasetField/types";
import type { LocalDatasetId } from "@/models/LocalDataset/types";

export type UseExplorerDraftReturn = {
  aggregations: Record<string, QueryAggregationType>;
  selectedDatasetId?: LocalDatasetId;
  selectedFields: readonly LocalDatasetField[];
  selectedGroupByFields: readonly LocalDatasetField[];
  vizConfig: VizConfig;

  setAggregations: (agg: Record<string, QueryAggregationType>) => void;
  setSelectedDatasetId: (id: LocalDatasetId | undefined) => void;
  setSelectedFields: (fields: readonly LocalDatasetField[]) => void;
  setSelectedGroupByFields: (fields: readonly LocalDatasetField[]) => void;
  setVizConfig: (vc: VizConfig) => void;
  reset: () => void;
};

type ExplorerDraft = {
  aggregations: Record<string, QueryAggregationType>;
  selectedDatasetId?: LocalDatasetId;
  selectedFields: readonly LocalDatasetField[];
  selectedGroupByFields: readonly LocalDatasetField[];
  vizConfig: VizConfig;
};

const DEFAULTS: ExplorerDraft = {
  aggregations: {},
  selectedDatasetId: undefined,
  selectedFields: [],
  selectedGroupByFields: [],
  vizConfig: makeDefaultVizConfig("table"),
};

const DRAFT_KEY = ["data-explorer", "draft"] as const;

export function useExplorerDraft(): UseExplorerDraftReturn {
  const qc = useQueryClient();

  // SUBSCRIBE to changes
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
        return {
          ...prev,
          ...update,
        };
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
    (id: ExplorerDraft["selectedDatasetId"]) => {
      return patch({ selectedDatasetId: id });
    },
    [patch],
  );
  const setSelectedFields = useCallback(
    (fields: ExplorerDraft["selectedFields"]) => {
      return patch({ selectedFields: fields });
    },
    [patch],
  );
  const setSelectedGroupByFields = useCallback(
    (fields: ExplorerDraft["selectedGroupByFields"]) => {
      return patch({ selectedGroupByFields: fields });
    },
    [patch],
  );
  const setVizConfig = useCallback(
    (vc: ExplorerDraft["vizConfig"]) => {
      return patch({ vizConfig: vc });
    },
    [patch],
  );
  const reset = useCallback(() => {
    return qc.setQueryData<ExplorerDraft>(DRAFT_KEY, DEFAULTS);
  }, [qc]);

  return useMemo(() => {
    return {
      ...draft,
      setAggregations,
      setSelectedDatasetId,
      setSelectedFields,
      setSelectedGroupByFields,
      setVizConfig,
      reset,
    };
  }, [
    draft,
    setAggregations,
    setSelectedDatasetId,
    setSelectedFields,
    setSelectedGroupByFields,
    setVizConfig,
    reset,
  ]);
}
