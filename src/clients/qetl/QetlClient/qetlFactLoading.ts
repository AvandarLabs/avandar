import {
  isDefined,
  makeBucketRecord,
  makeIdLookupRecord,
  promiseMap,
  prop,
  propEq,
  where,
} from "@avandar/utils";
import { match } from "ts-pattern";
import { OpenDataCatalogEntryClient } from "@/clients/catalog-entries/OpenDataCatalogEntryClient";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { LocalDatasetClient } from "@/clients/datasets/LocalDatasetClient/LocalDatasetClient";
import { DuckDbClient } from "@/clients/DuckDbClient/DuckDbClient";
import { DuckDbDataTypeUtils } from "@/clients/DuckDbClient/DuckDbDataType";
import { DatasetParquetStorageClient } from "@/clients/storage/DatasetParquetStorageClient/DatasetParquetStorageClient";
import { AvaQueryClient } from "@/config/AvaQueryClient";
import type { DatasetDuckDbLease } from "@/clients/DuckDbClient/DatasetDuckDbCoordinator/DatasetDuckDbCoordinator";
import type {
  ColumnReplacement,
  DiceExtractor,
  ExtractedFact,
  QetlRunnerOptions,
  QetlRunQuery,
} from "@/clients/qetl/QetlClient/QetlClient.types";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";

type FetchExtractorOptions = {
  extractor: DiceExtractor;
  datasetDuckDbLease: DatasetDuckDbLease;
  runQuery: QetlRunQuery;
};

function _getColumnReplacements(
  columns: readonly DatasetColumn.T[],
): ColumnReplacement[] {
  return columns
    .map((column) => {
      const hasChangedName = column.name !== column.originalName;
      const hasChangedDataType =
        column.dataType !==
        DuckDbDataTypeUtils.toAvaDataType(column.detectedDataType);
      return hasChangedName || hasChangedDataType ?
          {
            originalName: column.originalName,
            alias: hasChangedName ? column.name : undefined,
            dataType:
              hasChangedDataType ?
                DuckDbDataTypeUtils.fromDatasetColumnType(column.dataType)
              : undefined,
          }
        : undefined;
    })
    .filter(isDefined);
}

async function _getCachedFact(
  extractor: Readonly<DiceExtractor>,
): Promise<ExtractedFact | undefined> {
  const localDataset = await LocalDatasetClient.getById({
    id: extractor.dataset.id,
  });
  return localDataset?.parseStatus === "ready" && localDataset.parquetData ?
      { datasetId: extractor.dataset.id, parquetBlob: localDataset.parquetData }
    : undefined;
}

async function _downloadStoredDatasetFact(
  extractor: Readonly<
    Extract<DiceExtractor, { sourceType: "csv_file" | "xlsx_file" }>
  >,
): Promise<ExtractedFact> {
  const parquetBlob = await DatasetParquetStorageClient.downloadDataset({
    datasetId: extractor.dataset.id,
    workspaceId: extractor.dataset.workspaceId,
  });
  if (!parquetBlob) {
    throw new Error(
      `Failed to download data for ${extractor.sourceType} dataset '${extractor.dataset.id}' (${extractor.dataset.name})`,
    );
  }
  return { datasetId: extractor.dataset.id, parquetBlob };
}

async function _downloadOpenDataFact(
  extractor: Readonly<Extract<DiceExtractor, { sourceType: "open_data" }>>,
): Promise<ExtractedFact> {
  const catalogEntry = await OpenDataCatalogEntryClient.getOne(
    where("id", "eq", extractor.sourceDataset.catalogEntryId),
  );
  const parquetUrl = catalogEntry?.canonicalUrls?.find((url) => {
    return url.toLowerCase().endsWith(".parquet");
  });
  if (!parquetUrl) {
    throw new Error(
      `No Parquet URL in catalog for dataset '${extractor.dataset.name}'`,
    );
  }
  const response = await fetch(parquetUrl);
  if (!response.ok) {
    throw new Error(
      `Open data Parquet download failed: ${response.statusText}`,
    );
  }
  return {
    datasetId: extractor.dataset.id,
    parquetBlob: await response.blob(),
  };
}

async function _fetchExtractor(
  options: Readonly<FetchExtractorOptions>,
): Promise<ExtractedFact> {
  const cachedFact = await _getCachedFact(options.extractor);
  if (cachedFact) {
    return cachedFact;
  }
  return match(options.extractor)
    .with({ sourceType: "csv_file" }, _downloadStoredDatasetFact)
    .with({ sourceType: "xlsx_file" }, _downloadStoredDatasetFact)
    .with({ sourceType: "open_data" }, _downloadOpenDataFact)
    .with({ sourceType: "virtual" }, async (extractor) => {
      return {
        datasetId: extractor.dataset.id,
        parquetBlob: await options.runQuery({
          rawSql: extractor.sourceDataset.rawSql,
          returnType: "parquet",
          datasetDuckDbLease: options.datasetDuckDbLease,
        }),
      };
    })
    .with({ sourceType: "google_sheets" }, () => {
      throw new Error("Google Sheets data fetching is not supported yet");
    })
    .exhaustive();
}

/**
 * Fetches each dice's parquet bytes, one extractor at a time.
 *
 * A virtual dataset's extractor runs its own Qetl query under the same
 * dataset lease, which loads further tables into the shared memory cube, so
 * these fetches must stay sequential rather than racing on that cube.
 */
export async function fetchDiceFacts(
  options: Readonly<{
    extractors: readonly DiceExtractor[];
    datasetDuckDbLease: DatasetDuckDbLease;
    runQuery: QetlRunQuery;
  }>,
): Promise<ExtractedFact[]> {
  return options.extractors.reduce<Promise<ExtractedFact[]>>(
    async (priorFactsPromise, extractor) => {
      const priorFacts = await priorFactsPromise;
      const extractedFact = await _fetchExtractor({ ...options, extractor });
      return priorFacts.concat(extractedFact);
    },
    Promise.resolve([]),
  );
}

/** Writes fetched facts to the storage cube and into the memory cube. */
export async function loadDiceFacts(
  options: Readonly<{
    facts: readonly ExtractedFact[];
    datasetDuckDbLease: DatasetDuckDbLease;
    insertToStorageCache: QetlRunnerOptions["insertToStorageCache"];
  }>,
): Promise<void> {
  const storedFacts = await LocalDatasetClient.withCache(AvaQueryClient)
    .withEnsureQueryData()
    .getAll(where("datasetId", "in", options.facts.map(prop("datasetId"))));
  const factsToCache = options.facts.filter((fact) => {
    return !storedFacts.some(propEq("datasetId", fact.datasetId));
  });
  await options.insertToStorageCache(factsToCache);
  const columns = await DatasetColumnClient.withCache(AvaQueryClient)
    .withEnsureQueryData()
    .getAll(where("dataset_id", "in", options.facts.map(prop("datasetId"))));
  const columnsByDatasetId = makeBucketRecord(columns, { key: "datasetId" });
  await promiseMap(options.facts, (fact) => {
    return DuckDbClient.loadParquet({
      tableName: fact.datasetId,
      blob: fact.parquetBlob,
      datasetDuckDbLease: options.datasetDuckDbLease,
      columnReplacements: makeIdLookupRecord(
        _getColumnReplacements(columnsByDatasetId[fact.datasetId] ?? []),
        { key: "originalName" },
      ),
    });
  });
}
