import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type {
  DatasetsById,
  DatasetsBySourceType,
  RelationSource,
} from "@/clients/qetl/QueryMediator/QueryMediator.types";

import {
  makeBucketRecord,
  makeIdLookupRecord,
  objectKeys,
  promiseFlatMap,
  prop,
  where,
} from "@avandar/utils";

import { coversColumns } from "$/models/relations/RelationCacheKey/RelationCacheKey";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { CsvFileDatasetClient } from "@/clients/datasets/source-datasets/CsvFileDatasetClient";
import { GoogleSheetsDatasetClient } from "@/clients/datasets/source-datasets/GoogleSheetsDatasetClient";
import { OpenDataDatasetClient } from "@/clients/datasets/source-datasets/OpenDataDatasetClient";
import { PdfFileDatasetClient } from "@/clients/datasets/source-datasets/PdfFileDatasetClient";
import { VirtualDatasetClient } from "@/clients/datasets/source-datasets/VirtualDatasetClient";
import { XlsxFileDatasetClient } from "@/clients/datasets/source-datasets/XlsxFileDatasetClient";
import { DuckDbClient } from "@/clients/DuckDbClient/DuckDbClient";
import { getQueryableColumns } from "@/clients/qetl/QueryMediator/queryableRelationColumns/queryableRelationColumns";
import { AvaQueryClient } from "@/config/AvaQueryClient";

type SourceRecordReaderOptions = {
  ids: readonly Dataset.Id[];
  datasetsById: DatasetsById;
};

/**
 * Returns the query's dependencies that the queryable tier cannot serve:
 * missing from DuckDB, or present but too narrow for `neededByDatasetId`.
 *
 * A present table with no sidecar entry is treated as `"all"`, which is how
 * tables loaded outside this recorder still hit.
 */
export async function probeRelationCache(
  queryDependencies: readonly Dataset.Id[],
  neededByDatasetId: Readonly<Record<string, readonly string[] | "all">> = {},
): Promise<Dataset.Id[]> {
  if (queryDependencies.length === 0) {
    return [];
  }
  const inMemoryRelationIds = await DuckDbClient.getTableOrViewNames();
  const inMemoryRelationIdSet = new Set(inMemoryRelationIds);
  return queryDependencies.filter((datasetId) => {
    if (!inMemoryRelationIdSet.has(datasetId)) {
      return true;
    }
    const loaded = getQueryableColumns(datasetId) ?? "all";
    const needed = neededByDatasetId[datasetId] ?? "all";
    return !coversColumns(loaded, needed);
  });
}

async function _getCsvExtractors(
  options: Readonly<SourceRecordReaderOptions>,
): Promise<RelationSource[]> {
  const sources = await CsvFileDatasetClient.withCache(AvaQueryClient)
    .withEnsureQueryData()
    .getAll(where("dataset_id", "in", options.ids));
  return sources.map((sourceDataset) => {
    return {
      dataset: options.datasetsById[sourceDataset.datasetId]!,
      sourceType: "csv_file",
      sourceDataset,
    };
  });
}

async function _getXlsxExtractors(
  options: Readonly<SourceRecordReaderOptions>,
): Promise<RelationSource[]> {
  const sources = await XlsxFileDatasetClient.withCache(AvaQueryClient)
    .withEnsureQueryData()
    .getAll(where("dataset_id", "in", options.ids));
  return sources.map((sourceDataset) => {
    return {
      dataset: options.datasetsById[sourceDataset.datasetId]!,
      sourceType: "xlsx_file",
      sourceDataset,
    };
  });
}

async function _getPdfExtractors(
  options: Readonly<SourceRecordReaderOptions>,
): Promise<RelationSource[]> {
  const sources = await PdfFileDatasetClient.withCache(AvaQueryClient)
    .withEnsureQueryData()
    .getAll(where("dataset_id", "in", options.ids));
  return sources.map((sourceDataset) => {
    return {
      dataset: options.datasetsById[sourceDataset.datasetId]!,
      sourceType: "pdf_file",
      sourceDataset,
    };
  });
}

async function _getVirtualExtractors(
  options: Readonly<SourceRecordReaderOptions>,
): Promise<RelationSource[]> {
  const sources = await VirtualDatasetClient.withCache(AvaQueryClient)
    .withEnsureQueryData()
    .getAll(where("dataset_id", "in", options.ids));
  return sources.map((sourceDataset) => {
    return {
      dataset: options.datasetsById[sourceDataset.datasetId]!,
      sourceType: "virtual",
      sourceDataset,
    };
  });
}

async function _getOpenDataExtractors(
  options: Readonly<SourceRecordReaderOptions>,
): Promise<RelationSource[]> {
  const sources = await OpenDataDatasetClient.withCache(AvaQueryClient)
    .withEnsureQueryData()
    .getAll(where("dataset_id", "in", options.ids));
  return sources.map((sourceDataset) => {
    return {
      dataset: options.datasetsById[sourceDataset.datasetId]!,
      sourceType: "open_data",
      sourceDataset,
    };
  });
}

/**
 * Pairs `google_sheets` datasets with their stored Drive file and tab.
 */
async function _getGoogleSheetsExtractors(
  options: Readonly<SourceRecordReaderOptions>,
): Promise<RelationSource[]> {
  const sources = await GoogleSheetsDatasetClient.withCache(AvaQueryClient)
    .withEnsureQueryData()
    .getAll(where("dataset_id", "in", options.ids));
  return sources.map((sourceDataset) => {
    return {
      dataset: options.datasetsById[sourceDataset.datasetId]!,
      sourceType: "google_sheets",
      sourceDataset,
    };
  });
}

/**
 * The source-record reader for each dataset source type.
 *
 * A `Record` keyed by the source-type union rather than a `match`, which keeps
 * the exhaustiveness the `match` gave (adding a source type fails to compile
 * here until it has an entry) while making a new source one entry instead of a
 * new branch. The readers stay separate because each pairs its own literal
 * source type with its own source-record type, and `RelationSource` is a
 * discriminated union over exactly that pairing: one generic reader would admit
 * mismatched combinations the union forbids.
 */
const _EXTRACTOR_READER_BY_SOURCE_TYPE: Record<
  Dataset.T["sourceType"],
  (options: Readonly<SourceRecordReaderOptions>) => Promise<RelationSource[]>
> = {
  csv_file: _getCsvExtractors,
  xlsx_file: _getXlsxExtractors,
  pdf_file: _getPdfExtractors,
  virtual: _getVirtualExtractors,
  open_data: _getOpenDataExtractors,
  google_sheets: _getGoogleSheetsExtractors,
};

async function _getExtractorsForSourceType(
  options: Readonly<{
    sourceType: Dataset.T["sourceType"];
    datasetsBySourceType: DatasetsBySourceType;
    datasetsById: DatasetsById;
  }>,
): Promise<RelationSource[]> {
  return await _EXTRACTOR_READER_BY_SOURCE_TYPE[options.sourceType]({
    ids: options.datasetsBySourceType[options.sourceType].map(prop("id")),
    datasetsById: options.datasetsById,
  });
}

/** Resolves each relation to the source record that says how to fetch it. */
export async function getRelationSources(
  relation: readonly Dataset.Id[],
): Promise<RelationSource[]> {
  const datasets = await DatasetClient.withCache(AvaQueryClient)
    .withEnsureQueryData()
    .getAll(where("id", "in", relation));
  const datasetsById = makeIdLookupRecord(datasets);
  const datasetsBySourceType = makeBucketRecord(datasets, {
    key: "sourceType",
  });
  return promiseFlatMap(objectKeys(datasetsBySourceType), (sourceType) => {
    return _getExtractorsForSourceType({
      sourceType,
      datasetsBySourceType,
      datasetsById,
    });
  });
}
