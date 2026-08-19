import type {
  DatasetSourceType,
  NonReconstructableDatasetSourceType,
} from "$/models/datasets/DatasetSource/DatasetSource.types.ts";

/**
 * The single source of truth for which source types retain their original
 * file. Declared as a `Record` over the full union rather than a `Set` of
 * strings so that adding a member to `DatasetSourceType` without deciding
 * its retention behaviour is a compile error, not a silent `false`.
 */
const RETENTION_BY_SOURCE_TYPE: Record<DatasetSourceType, boolean> = {
  csv_file: false,
  google_sheets: false,
  open_data: false,
  pdf_file: true,
  virtual: false,
  xlsx_file: false,
};

/**
 * True when the original uploaded file must be retained because it cannot be
 * reconstructed from the parquet blob plus stored metadata.
 *
 * See `NonReconstructableDatasetSourceType` for the reasoning.
 */
export function requiresOriginalFileRetention(
  sourceType: DatasetSourceType,
): sourceType is NonReconstructableDatasetSourceType {
  return RETENTION_BY_SOURCE_TYPE[sourceType];
}
