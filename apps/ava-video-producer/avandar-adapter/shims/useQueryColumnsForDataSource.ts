import { EXPLORER_COLUMNS } from "../Explorer.constants";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";

type QueryColumnsForDataSource = {
  columns: QueryColumn.T[];
  isLoading: boolean;
};

/**
 * In-memory fixture metadata replaces the product's dataset-column client hook.
 */
export function useQueryColumnsForDataSource(): QueryColumnsForDataSource {
  return { columns: EXPLORER_COLUMNS, isLoading: false };
}
