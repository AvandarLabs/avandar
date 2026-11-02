import { makeBucketRecord, matchLiteral, prop, where } from "@avandar/utils";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { CsvFileDatasetClient } from "@/clients/datasets/source-datasets/CsvFileDatasetClient";
import { GoogleSheetsDatasetClient } from "@/clients/datasets/source-datasets/GoogleSheetsDatasetClient";
import { OpenDataDatasetClient } from "@/clients/datasets/source-datasets/OpenDataDatasetClient";
import { PdfFileDatasetClient } from "@/clients/datasets/source-datasets/PdfFileDatasetClient";
import { VirtualDatasetClient } from "@/clients/datasets/source-datasets/VirtualDatasetClient";
import { XlsxFileDatasetClient } from "@/clients/datasets/source-datasets/XlsxFileDatasetClient";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetSource } from "$/models/datasets/DatasetSource/DatasetSource";
import type { DatasetQueryConfig } from "@/clients/datasets/DatasetClient/DatasetClient.types";
import type { FiltersByColumn } from "@avandar/utils";

function _makeGetSourceDataset(config: Readonly<DatasetQueryConfig>): (
  params: Readonly<{
    datasetId: Dataset.Id;
    sourceType: DatasetSource.SourceType;
  }>,
) => Promise<DatasetSource.T | undefined> {
  return async (params) => {
    const { datasetId, sourceType } = params;
    config.clientLogger
      .appendName("getSourceDataset")
      .log("Getting the source dataset", params);
    return matchLiteral(sourceType, {
      virtual: () => {
        return VirtualDatasetClient.getOne(
          where("dataset_id", "eq", datasetId),
        );
      },
      csv_file: () => {
        return CsvFileDatasetClient.getOne(
          where("dataset_id", "eq", datasetId),
        );
      },
      google_sheets: () => {
        return GoogleSheetsDatasetClient.getOne(
          where("dataset_id", "eq", datasetId),
        );
      },
      open_data: () => {
        return OpenDataDatasetClient.getOne(
          where("dataset_id", "eq", datasetId),
        );
      },
      xlsx_file: () => {
        return XlsxFileDatasetClient.getOne(
          where("dataset_id", "eq", datasetId),
        );
      },
      pdf_file: () => {
        return PdfFileDatasetClient.getOne(
          where("dataset_id", "eq", datasetId),
        );
      },
    });
  };
}

function _makeGetWithColumns(
  config: Readonly<DatasetQueryConfig>,
): (
  params: Readonly<{ id: Dataset.Id | undefined }>,
) => Promise<Dataset.WithColumns | undefined> {
  return async (params) => {
    const logger = config.clientLogger.appendName("getWithColumns");
    logger.log("Getting dataset with columns", params);
    if (params.id === undefined) {
      logger.log("Skipping fetching dataset because id is undefined");
      return undefined;
    }
    const { data } = await config.dbClient
      .from("datasets")
      .select("*, columns:dataset_columns(*)")
      .eq("id", params.id)
      .single()
      .throwOnError();
    const { columns, ...dataset } = data;
    return {
      ...config.parsers.fromDBReadToModelRead(dataset),
      columns: columns.map(DatasetColumnClient.parsers.fromDBReadToModelRead),
    };
  };
}

function _makeGetAllDatasetsWithColumns(
  config: Readonly<DatasetQueryConfig>,
): (
  params?: Readonly<{ where?: FiltersByColumn<Dataset.T<"DBRead">> }>,
) => Promise<Dataset.WithColumns[]> {
  return async (params) => {
    const logger = config.clientLogger.appendName("getAllDatasetsWithColumns");
    const datasets = await config.client.getAll(params);
    const allDatasetColumns = await DatasetColumnClient.getAll(
      where("dataset_id", "in", datasets.map(prop("id"))),
    );
    const columnsByDataset = makeBucketRecord(allDatasetColumns, {
      key: "datasetId",
    });
    const datasetsWithColumns = datasets.map((dataset: Dataset.T) => {
      return {
        ...dataset,
        columns: columnsByDataset[dataset.id] ?? [],
      };
    });
    logger.log(
      "Successfully got all datasets with columns",
      datasetsWithColumns,
    );
    return datasetsWithColumns;
  };
}

/** Builds the dataset queries layered on top of the CRUD client. */
export function createDatasetQueries(config: Readonly<DatasetQueryConfig>): {
  getSourceDataset: ReturnType<typeof _makeGetSourceDataset>;
  getWithColumns: ReturnType<typeof _makeGetWithColumns>;
  getAllDatasetsWithColumns: ReturnType<typeof _makeGetAllDatasetsWithColumns>;
} {
  return {
    getSourceDataset: _makeGetSourceDataset(config),
    getWithColumns: _makeGetWithColumns(config),
    getAllDatasetsWithColumns: _makeGetAllDatasetsWithColumns(config),
  };
}
