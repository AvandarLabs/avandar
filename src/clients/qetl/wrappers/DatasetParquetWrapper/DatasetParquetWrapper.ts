import { where } from "@avandar/utils";
import { match } from "ts-pattern";
import { OpenDataCatalogEntryClient } from "@/clients/catalog-entries/OpenDataCatalogEntryClient";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { CsvFileDatasetClient } from "@/clients/datasets/source-datasets/CsvFileDatasetClient";
import { OpenDataDatasetClient } from "@/clients/datasets/source-datasets/OpenDataDatasetClient";
import { XlsxFileDatasetClient } from "@/clients/datasets/source-datasets/XlsxFileDatasetClient";
import { readDatasetRelationSchema } from "@/clients/qetl/wrappers/DatasetParquetWrapper/readDatasetRelationSchema";
import { DatasetParquetStorageClient } from "@/clients/storage/DatasetParquetStorageClient/DatasetParquetStorageClient";
import { AvaQueryClient } from "@/config/AvaQueryClient";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { RelationCapabilities } from "$/models/relations/RelationCapabilities/RelationCapabilities.types";
import type { RelationRef } from "$/models/relations/RelationRef/RelationRef";
import type {
  AcquiredRelation,
  SourceWrapper,
} from "$/models/relations/SourceWrapper/SourceWrapper.types";

type DatasetRef = Extract<RelationRef.T, { kind: "dataset" }>;

const CAPABILITIES = {
  relations: "single",
  acquisitionUnit: { kind: "whole-relation" },

  /**
   * A Parquet blob in storage, or at a catalog URL, answers no questions: it
   * is downloaded whole and filtered locally. Declaring `none` is what tells
   * the mediator to acquire rather than to ask, and it is why this wrapper has
   * no `pushDown`.
   */
  predicatePushdown: "none",
  aggregatePushdown: false,
  wholeRelationAcquirable: "yes",
  maxRowsPerCall: "unbounded",
  maxBytesPerCall: "unbounded",

  /**
   * Nothing here reports a cheap change token today: stored Parquet carries no
   * version we read, and the open data catalog entry's modified time is not
   * consulted. `none` matches `readFreshness` being absent, so the mediator
   * never believes it has a freshness answer for these sources.
   */
  freshnessSignal: "none",

  /**
   * Parquet row order is stable for a given blob but carries no key, so rows
   * are identified by position only.
   */
  rowIdentity: "positional",

  /** One download produces the whole relation, so there is one snapshot. */
  multiCallAtomicity: true,
  quotaScope: { kind: "none" },
  grantedScope: [],
} satisfies RelationCapabilities;

type DatasetParquetWrapperOptions = {
  /**
   * Fetches one dataset's Parquet bytes. Defaults to the storage and catalog
   * download path the relation loader already uses; injected so a test can
   * drive
   * `acquire` without any client.
   */
  fetchParquet?: (ref: DatasetRef) => Promise<Blob>;

  /**
   * Resolves a dataset record. Injected so a caller that has already read the
   * dataset can hand it over rather than paying for a second read: the relation
   * loader resolves every relation to its dataset before acquisition begins,
   * and
   * re-reading here would add a query the old dispatch never made.
   */
  getDataset?: (id: Dataset.Id) => Promise<Dataset.T>;
};

/**
 * Reads one dataset through the cached client.
 *
 * `getAll` with an `in` filter rather than `getById`, because that is the shape
 * every other caller of this client uses, including the relation loader this
 * wrapper replaced. The distinction is not cosmetic: `getById` is not part of
 * the surface `withEnsureQueryData()` exposes.
 */
async function _getDataset(datasetId: Dataset.Id): Promise<Dataset.T> {
  const datasets = await DatasetClient.withCache(AvaQueryClient)
    .withEnsureQueryData()
    .getAll(where("id", "in", [datasetId]));
  const dataset = datasets[0];
  if (!dataset) {
    throw new Error(`Dataset '${datasetId}' does not exist`);
  }
  return dataset;
}

/**
 * Downloads a `csv_file` or `xlsx_file` dataset's stored Parquet, resolving
 * its source record first. The source record's fields are not needed to build
 * the storage path; resolving it anyway keeps the requests, and the cache
 * entries they populate, identical to the relation extractor path this
 * replaces.
 */
async function _downloadStoredParquet(
  dataset: Readonly<Dataset.T>,
  sourceType: "csv_file" | "xlsx_file",
): Promise<Blob> {
  const sourceClient =
    sourceType === "csv_file" ? CsvFileDatasetClient : XlsxFileDatasetClient;
  await sourceClient
    .withCache(AvaQueryClient)
    .withEnsureQueryData()
    .getAll(where("dataset_id", "in", [dataset.id]));
  const parquetBlob = await DatasetParquetStorageClient.downloadDataset({
    datasetId: dataset.id,
    workspaceId: dataset.workspaceId,
  });
  if (!parquetBlob) {
    throw new Error(
      `Failed to download data for ${sourceType} dataset '${dataset.id}' (${dataset.name})`,
    );
  }
  return parquetBlob;
}

/**
 * Downloads an `open_data` dataset from the Parquet URL its catalog entry
 * names. The catalog entry read is deliberately uncached, as it is today.
 */
async function _downloadOpenDataParquet(
  dataset: Readonly<Dataset.T>,
): Promise<Blob> {
  const sourceDatasets = await OpenDataDatasetClient.withCache(AvaQueryClient)
    .withEnsureQueryData()
    .getAll(where("dataset_id", "in", [dataset.id]));
  const sourceDataset = sourceDatasets[0];
  if (!sourceDataset) {
    throw new Error(
      `No open data source record for dataset '${dataset.id}' (${dataset.name})`,
    );
  }
  const catalogEntry = await OpenDataCatalogEntryClient.getOne(
    where("id", "eq", sourceDataset.catalogEntryId),
  );
  const parquetUrl = catalogEntry?.canonicalUrls?.find((url) => {
    return url.toLowerCase().endsWith(".parquet");
  });
  if (!parquetUrl) {
    throw new Error(`No Parquet URL in catalog for dataset '${dataset.name}'`);
  }
  const response = await fetch(parquetUrl);
  if (!response.ok) {
    throw new Error(
      `Open data Parquet download failed: ${response.statusText}`,
    );
  }
  return await response.blob();
}

async function _fetchParquetFromSource(
  ref: DatasetRef,
  getDataset: (id: Dataset.Id) => Promise<Dataset.T>,
): Promise<Blob> {
  const dataset = await getDataset(ref.id);
  return match(dataset.sourceType)
    .with("csv_file", "xlsx_file", (sourceType) => {
      return _downloadStoredParquet(dataset, sourceType);
    })
    .with("open_data", () => {
      return _downloadOpenDataParquet(dataset);
    })
    .with("virtual", "google_sheets", (sourceType) => {
      throw new Error(
        `Dataset '${ref.id}' is a ${sourceType} dataset, which the dataset Parquet wrapper does not acquire`,
      );
    })
    .exhaustive();
}

/**
 * Acquires the dataset source types whose rows already exist as Parquet:
 * `csv_file`, `xlsx_file` and `open_data`. Each is downloaded whole, because
 * none of the three can be asked a question.
 *
 * `handles` narrows on the reference kind alone, which is all a `RelationRef`
 * carries; a dataset's source type is stored, not encoded in its reference, so
 * the registry is what keeps a `virtual` or `google_sheets` dataset from
 * arriving here. When one does, `acquire` refuses rather than guessing.
 */
export function createDatasetParquetWrapper(
  options: Readonly<DatasetParquetWrapperOptions> = {},
): SourceWrapper<DatasetRef> {
  const getDataset = options.getDataset ?? _getDataset;
  const fetchParquet =
    options.fetchParquet ??
    ((ref: DatasetRef) => {
      return _fetchParquetFromSource(ref, getDataset);
    });

  return {
    name: "dataset-parquet",
    capabilities: CAPABILITIES,

    handles: (ref): ref is DatasetRef => {
      return ref.kind === "dataset";
    },

    describe: async (ref) => {
      return await readDatasetRelationSchema(ref.id);
    },

    // The column subset is ignored: these sources project nothing, and a
    // returned superset satisfies the request.
    acquire: async ({ ref }): Promise<AcquiredRelation> => {
      return {
        ref,
        parquetBlob: await fetchParquet(ref),
        sourceVersion: undefined,
      };
    },
  };
}
