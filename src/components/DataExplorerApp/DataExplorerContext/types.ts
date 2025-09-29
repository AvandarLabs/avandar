import { QueryAggregationType } from "@/clients/DuckDBClient/types";
import { QueryableDataSource } from "../QueryableDataSourceSelect";
import type { QueryableColumn } from "../QueryableColumnMultiSelect";
import type { VizConfig } from "../VizSettingsForm/makeDefaultVizConfig";

export type DataExplorerContextTypeValues = {
  aggregations: Record<string, QueryAggregationType>;
  selectedDataSource?: QueryableDataSource;
  selectedColumns: readonly QueryableColumn[];
  selectedGroupByColumns: readonly QueryableColumn[];
  orderByColumn?: QueryableColumn;
  orderByDirection: "asc" | "desc";
  vizConfig: VizConfig;
};

export type DataExplorerContextType = DataExplorerContextTypeValues & {
  setAggregations: (newValue: Record<string, QueryAggregationType>) => void;
  setSelectedDataSource: (newValue: QueryableDataSource | undefined) => void;
  setSelectedColumns: (newValue: readonly QueryableColumn[]) => void;
  setSelectedGroupByColumns: (newValue: readonly QueryableColumn[]) => void;
  setOrderByColumn: (newValue: QueryableColumn | undefined) => void;
  setOrderByDirection: (newValue: "asc" | "desc") => void;
  setVizConfig: (newValue: VizConfig) => void;
  onSelectedDataSourceChange: (
    newValue: QueryableDataSource | undefined,
  ) => void;
  reset: () => void;
};
