import { EXPLORER_COLUMNS } from "../Explorer.constants";

/** In-memory fixture metadata replaces the product's dataset-column client hook. */
export function useQueryColumnsForDataSource() {
  return { columns: EXPLORER_COLUMNS, isLoading: false };
}
