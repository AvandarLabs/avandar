import { Model } from "@avandar/models";
import { MIMEType, snakeCaseKeysShallow } from "@avandar/utils";
import { t } from "@lingui/core/macro";
import { uuid } from "$/lib/uuid";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { LocalDatasetClient } from "@/clients/datasets/LocalDatasetClient/LocalDatasetClient";
import { PluginContentImportClient } from "@/clients/plugins/PluginContentImportClient/PluginContentImportClient";
import { DatasetParquetStorageClient } from "@/clients/storage/DatasetParquetStorageClient/DatasetParquetStorageClient";
import { duckDbColumnsToImportedColumns } from "@/views/DataManagerApp/DataImportView/DatasetImportForm/useSaveDataset/duckDbColumnsToImportedColumns";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { User } from "$/models/User/User";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { CsvDatasetParseOptions } from "@/clients/datasets/DatasetClient/DatasetClient.types";
import type { DuckDbCsvSniffResult } from "@/clients/DuckDbClient/DuckDbClient.types";
import type { PluginContentItem } from "@avandar/plugin-manifest/runtime";

/** Downloads a content item's bundled CSV as a file named like the original. */
async function _fetchContentFile(options: {
  url: string;
  item: PluginContentItem;
}): Promise<File> {
  const { url, item } = options;
  const response = await fetch(url);
  // A host that answers a missing asset with its app page and a 200 must not
  // become a dataset, so an HTML response counts as a failed download.
  const isHtml = response.headers.get("content-type")?.startsWith("text/html");
  if (!response.ok || isHtml === true) {
    const { status } = response;
    const filePath = item.file;
    throw new Error(t`Could not download ${filePath} (HTTP ${status}).`);
  }
  const fileName = item.file.split("/").pop() ?? item.file;
  return new File([await response.blob()], fileName, {
    type: MIMEType.TEXT_CSV,
  });
}

/** The CSV dialect DuckDB sniffed, as a dataset stores it. */
function _makeParseOptionsFromSniff(
  csvSniff: DuckDbCsvSniffResult,
): CsvDatasetParseOptions {
  return {
    rowsToSkip: csvSniff.SkipRows,
    delimiter: csvSniff.Delimiter,
    quoteChar: csvSniff.Quote,
    escapeChar: csvSniff.Escape,
    newlineDelimiter: csvSniff.NewLineDelimiter,
    commentChar: csvSniff.Comment,
    hasHeader: csvSniff.HasHeader,
    dateFormat: csvSniff.DateFormat ?? undefined,
    timestampFormat: csvSniff.TimestampFormat ?? undefined,
  };
}

/**
 * Removes a half-imported dataset everywhere it may be, ignoring failures,
 * so the import's own error is the one the caller sees.
 */
async function _deleteDatasetBestEffort(datasetId: Dataset.Id): Promise<void> {
  await Promise.allSettled([
    DatasetClient.fullDelete({ id: datasetId }),
    LocalDatasetClient.dropLocalDataset({ datasetId }),
  ]);
}

type ImportPluginContentItemOptions = {
  workspaceId: Workspace.Id;
  userId: User.Id;
  pluginId: string;
  item: PluginContentItem;
  datasetName: string;
  datasetDescription: string;
  url: string;
};

/**
 * Saves the parsed file as a dataset, waits for its upload, and records the
 * import, in that order.
 */
async function _saveAndRecordDataset(
  options: Readonly<
    ImportPluginContentItemOptions & {
      datasetId: Dataset.Id;
      file: File;
      sniff: Awaited<ReturnType<typeof LocalDatasetClient.startCsvImport>>;
    }
  >,
): Promise<void> {
  const { workspaceId, datasetId, sniff } = options;
  await DatasetClient.insertCsvFileDataset({
    datasetId,
    workspaceId,
    datasetName: options.datasetName,
    datasetDescription: options.datasetDescription,
    columns: duckDbColumnsToImportedColumns(sniff.columns).map(
      snakeCaseKeysShallow,
    ),
    isInCloudStorage: true,
    sizeInBytes: options.file.size,
    parseOptions: _makeParseOptionsFromSniff(sniff.csvSniff),
  });
  await DatasetParquetStorageClient.startDatasetUpload({
    workspaceId,
    datasetId,
    sourceType: "csv_file",
  });
  await PluginContentImportClient.insert({
    data: Model.make("PluginContentImport", {
      workspaceId,
      pluginId: options.pluginId,
      contentId: options.item.id,
      datasetId,
    }),
  });
}

/**
 * Imports one plugin content item as an ordinary CSV dataset of the
 * workspace, the same way a CSV upload is saved: it parses the bundled file,
 * saves the dataset, waits for its upload, and only then records the import,
 * so a recorded item always has a complete dataset. Anything that fails
 * after the dataset is saved deletes it again before the error is rethrown.
 * The install wizard and a plugin's settings card import content with it.
 */
export async function importPluginContentItem(
  options: Readonly<ImportPluginContentItemOptions>,
): Promise<Dataset.Id> {
  const file = await _fetchContentFile({
    url: options.url,
    item: options.item,
  });
  const datasetId = uuid() as Dataset.Id;
  const sniff = await LocalDatasetClient.startCsvImport({
    datasetId,
    workspaceId: options.workspaceId,
    userId: options.userId,
    file,
    parseOptions: {},
  });
  try {
    await _saveAndRecordDataset({ ...options, datasetId, file, sniff });
  } catch (error) {
    await _deleteDatasetBestEffort(datasetId);
    throw error;
  }
  return datasetId;
}
