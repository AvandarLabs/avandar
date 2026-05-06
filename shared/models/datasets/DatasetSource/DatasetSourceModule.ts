import { registry } from "@utils/objects/registry/registry.ts";
import { match } from "ts-pattern";
import type { DatasetSourceType } from "$/models/datasets/DatasetSource/DatasetSource.types.ts";

function _canBeOfflineOnly(
  sourceType: DatasetSourceType,
): sourceType is "csv_file" | "xlsx_file";
function _canBeOfflineOnly(sourceType: {
  sourceType: DatasetSourceType;
}): sourceType is { sourceType: "csv_file" } | { sourceType: "xlsx_file" };
function _canBeOfflineOnly(sourceType: {
  type: DatasetSourceType;
}): sourceType is { type: "csv_file" } | { type: "xlsx_file" };
function _canBeOfflineOnly(
  sourceType:
    | DatasetSourceType
    | { sourceType: DatasetSourceType }
    | { type: DatasetSourceType },
): boolean {
  const type =
    typeof sourceType === "string" ? sourceType
    : "sourceType" in sourceType ? sourceType.sourceType
    : sourceType.type;
  return match(type)
    .with("csv_file", "xlsx_file", () => {
      return true;
    })
    .with("google_sheets", "open_data", "virtual", () => {
      return false;
    })
    .exhaustive();
}

export const DatasetSourceModule = {
  SourceTypes: registry<DatasetSourceType>().keys(
    "csv_file",
    "google_sheets",
    "open_data",
    "virtual",
    "xlsx_file",
  ),

  canBeOfflineOnly: _canBeOfflineOnly,
  isManuallyUploadable: _canBeOfflineOnly,
};
