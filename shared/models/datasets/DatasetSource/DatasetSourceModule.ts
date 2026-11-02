import { Model } from "@avandar/models";
import { registry } from "@avandar/utils";
import { match } from "ts-pattern";
import type {
  CanBeOfflineOnlyDatasetSourceModel,
  DatasetSourceModel,
  DatasetSourceType,
} from "$/models/datasets/DatasetSource/DatasetSource.types.ts";

function _canBeOfflineOnly(
  sourceType: DatasetSourceType,
): sourceType is "csv_file" | "xlsx_file" | "pdf_file";
function _canBeOfflineOnly(sourceType: {
  sourceType: DatasetSourceType;
}): sourceType is
  | { sourceType: "csv_file" }
  | { sourceType: "xlsx_file" }
  | { sourceType: "pdf_file" };
function _canBeOfflineOnly(sourceType: {
  type: DatasetSourceType;
}): sourceType is
  | { type: "csv_file" }
  | { type: "xlsx_file" }
  | { type: "pdf_file" };
function _canBeOfflineOnly(
  datasetSource: DatasetSourceModel,
): datasetSource is CanBeOfflineOnlyDatasetSourceModel;
function _canBeOfflineOnly(
  sourceType:
    | DatasetSourceType
    | DatasetSourceModel
    | { sourceType: DatasetSourceType }
    | { type: DatasetSourceType },
): boolean {
  const type =
    typeof sourceType === "string"
      ? sourceType
      : Model.isModel(sourceType)
        ? DatasetSourceModule.getSourceType(sourceType)
        : "sourceType" in sourceType
          ? sourceType.sourceType
          : sourceType.type;
  return match(type)
    .with("csv_file", "xlsx_file", "pdf_file", () => {
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
    "pdf_file",
    "virtual",
    "xlsx_file",
  ),

  canBeOfflineOnly: _canBeOfflineOnly,
  isManuallyUploadable: _canBeOfflineOnly,

  /**
   * Get the source type of a dataset source model.
   * @param datasetSource The dataset source model to get the source type of.
   * @returns The source type of the dataset source model.
   */
  getSourceType: (datasetSource: DatasetSourceModel): DatasetSourceType => {
    return Model.match(datasetSource, {
      CsvFileDataset: "csv_file",
      OpenDataDataset: "open_data",
      GoogleSheetsDataset: "google_sheets",
      PdfFileDataset: "pdf_file",
      VirtualDataset: "virtual",
      XlsxFileDataset: "xlsx_file",
    } as const);
  },
};
