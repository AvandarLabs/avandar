import type { LocalDatasetSourceFileType } from "@/models/LocalDataset/LocalDataset.types";
import type { DatasetSourceType } from "$/models/datasets/DatasetSource/DatasetSource.types";

/**
 * Bridges the two vocabularies we use for "what kind of file is this":
 * `LocalDatasetSourceFileType` (what the browser cached, e.g. `"pdf"`) and
 * `DatasetSourceType` (the domain-level source type, e.g. `"pdf_file"`).
 *
 * Every retention decision (`requiresOriginalFileRetention`,
 * `getOriginalFileExtensionFromSourceType`) is keyed on
 * `DatasetSourceType`, but the LocalDataset row only ever knows its
 * `sourceFileType`. Rather than thread a
 * second, independently-settable parameter through the local import paths,
 * where it could disagree with the row's own `sourceFileType`, we derive one
 * from the other here.
 *
 * Declared as a `Record` over the full `LocalDatasetSourceFileType` union so
 * that adding a locally-cached file kind without saying which source type it
 * belongs to is a compile error rather than a silent wrong answer.
 */
const DATASET_SOURCE_TYPE_BY_SOURCE_FILE_TYPE: Record<
  LocalDatasetSourceFileType,
  DatasetSourceType
> = {
  csv: "csv_file",
  xlsx: "xlsx_file",
  pdf: "pdf_file",
};

/**
 * Returns the domain-level `DatasetSourceType` a locally-cached source file
 * kind belongs to.
 */
export function getDatasetSourceTypeFromSourceFileType(
  sourceFileType: LocalDatasetSourceFileType,
): DatasetSourceType {
  return DATASET_SOURCE_TYPE_BY_SOURCE_FILE_TYPE[sourceFileType];
}
