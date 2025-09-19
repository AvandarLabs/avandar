import type { VizConfig } from "../VizSettingsForm/makeDefaultVizConfig";
import type { QueryAggregationType } from "@/clients/LocalDatasetQueryClient";
import type { DatasetId } from "@/models/datasets/Dataset";
import type { DatasetColumn } from "@/models/datasets/DatasetColumn";

export type OrderByDirection = "asc" | "desc" | null;

export type DataExplorerContextTypeValues = {
  aggregations: Record<string, QueryAggregationType>;
  selectedDatasetId?: DatasetId;
  selectedColumns: readonly DatasetColumn[];
  selectedGroupByColumns: readonly DatasetColumn[];
  orderByColumn?: DatasetColumn;
  orderByDirection: OrderByDirection;
  vizConfig: VizConfig;
};

export type DataExplorerContextType = DataExplorerContextTypeValues & {
  setAggregations: (newValue: Record<string, QueryAggregationType>) => void;
  setSelectedDatasetId: (newValue: DatasetId | undefined) => void;
  setSelectedColumns: (newValue: readonly DatasetColumn[]) => void;
  setSelectedGroupByColumns: (newValue: readonly DatasetColumn[]) => void;
  setOrderByColumn: (newValue: DatasetColumn | undefined) => void;
  setOrderByDirection: (newValue: OrderByDirection) => void;
  setVizConfig: (newValue: VizConfig) => void;
  onSelectDatasetChange: (newValue: DatasetId | undefined) => void;
  reset: () => void;
};
