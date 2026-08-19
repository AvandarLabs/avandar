import { where } from "@avandar/utils";
import { match } from "ts-pattern";
import { OpenDataCatalogEntryClient } from "@/clients/catalog-entries/OpenDataCatalogEntryClient";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { CsvFileDatasetClient } from "@/clients/datasets/source-datasets/CsvFileDatasetClient";
import { OpenDataDatasetClient } from "@/clients/datasets/source-datasets/OpenDataDatasetClient";
import { PdfFileDatasetClient } from "@/clients/datasets/source-datasets/PdfFileDatasetClient";
import { XlsxFileDatasetClient } from "@/clients/datasets/source-datasets/XlsxFileDatasetClient";
import { readDatasetRelationSchema } from "@/clients/qetl/wrappers/DatasetParquetWrapper/readDatasetRelationSchema";
import { DatasetParquetStorageClient } from "@/clients/storage/DatasetParquetStorageClient/DatasetParquetStorageClient";
import { AvaQueryClient } from "@/config/AvaQueryClient";
import type { OpenDataCatalogEntry } from "$/models/catalog-entries/OpenDataCatalogEntry/OpenDataCatalogEntry";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type {
  RelationCapabilities,
  SourceVersion,
} from "$/models/relations/RelationCapabilities/RelationCapabilities.types";
import type { RelationRef } from "$/models/relations/RelationRef/RelationRef";
import type {
  AcquiredRelation,
  SourceWrapper,
} from "$/models/relations/SourceWrapper/SourceWrapper.types";
import type { OpenDataContentKind } from "$/open-data/acquireOpenDataResource";

type DatasetRef = Extract<RelationRef.T, { kind: "dataset" }>;

/** Bytes fetched from an API-backed catalog entry, before any transcode. */
export type FetchedApiOpenDataResource = {
  contentKind: OpenDataContentKind;
  bytes: Uint8Array<ArrayBuffer>;
  sourceVersion: SourceVersion | undefined;
};

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
   * Stored Parquet carries no version we read. An API-backed catalog entry
   * does produce a token, which `acquire` returns on that path; the uploaded
   * file types still report none.
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

type FetchedParquet = {
  parquetBlob: Blob;
  sourceVersion: SourceVersion | undefined;
};

function _parquetBlobFromBytes(bytes: Uint8Array<ArrayBuffer>): Blob {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return new Blob([copy]);
}

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

  /**
   * Fetches one API-backed catalog resource through the open-data edge
   * function. Injected so a test drives the branch without a network.
   */
  fetchApiOpenDataResource?: (
    catalogEntryId: OpenDataCatalogEntry.Id,
  ) => Promise<FetchedApiOpenDataResource>;

  /**
   * Transcodes CSV bytes into Parquet. Bound to the caller's DuckDB lease so
   * acquisition does not race the outer query.
   */
  transcodeCsvToParquet?: (params: {
    datasetId: Dataset.Id;
    bytes: Uint8Array<ArrayBuffer>;
  }) => Promise<Blob>;
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
 * Downloads an uploaded-file dataset's stored Parquet, resolving its source
 * record first. The source record's fields are not needed to build the storage
 * path; resolving it anyway keeps the requests, and the cache entries they
 * populate, identical to the relation extractor path this replaces.
 */
async function _downloadStoredParquet(
  dataset: Readonly<Dataset.T>,
  sourceType: "csv_file" | "xlsx_file" | "pdf_file",
): Promise<Blob> {
  const sourceClient = match(sourceType)
    .with("csv_file", () => {
      return CsvFileDatasetClient;
    })
    .with("xlsx_file", () => {
      return XlsxFileDatasetClient;
    })
    .with("pdf_file", () => {
      return PdfFileDatasetClient;
    })
    .exhaustive();
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
 * Downloads a pipeline-produced `open_data` dataset from the Parquet URL its
 * catalog entry names. The catalog entry read is deliberately uncached, as it
 * is today.
 */
async function _downloadPipelineOpenDataParquet(
  dataset: Readonly<Dataset.T>,
  catalogEntry: Readonly<{
    canonicalUrls?: readonly string[];
  }>,
): Promise<FetchedParquet> {
  const parquetUrl = catalogEntry.canonicalUrls?.find((url) => {
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
  return { parquetBlob: await response.blob(), sourceVersion: undefined };
}

async function _downloadApiOpenData(
  options: Readonly<{
    datasetId: Dataset.Id;
    catalogEntryId: OpenDataCatalogEntry.Id;
    fetchApiOpenDataResource?: DatasetParquetWrapperOptions["fetchApiOpenDataResource"];
    transcodeCsvToParquet?: DatasetParquetWrapperOptions["transcodeCsvToParquet"];
  }>,
): Promise<FetchedParquet> {
  const fetchApi = options.fetchApiOpenDataResource;
  if (!fetchApi) {
    throw new Error(
      `No API open-data fetch for catalog entry '${options.catalogEntryId}'`,
    );
  }
  const acquisition = await fetchApi(options.catalogEntryId);
  if (acquisition.contentKind !== "csv") {
    return {
      parquetBlob: _parquetBlobFromBytes(acquisition.bytes),
      sourceVersion: acquisition.sourceVersion,
    };
  }
  const transcode = options.transcodeCsvToParquet;
  if (!transcode) {
    throw new Error(
      `No CSV transcode for catalog entry '${options.catalogEntryId}'`,
    );
  }
  return {
    parquetBlob: await transcode({
      datasetId: options.datasetId,
      bytes: acquisition.bytes,
    }),
    sourceVersion: acquisition.sourceVersion,
  };
}

/**
 * Downloads an `open_data` dataset: pipeline Parquet from its catalog URL, or
 * an API-backed resource through the injected edge-function fetch.
 */
async function _downloadOpenDataParquet(
  dataset: Readonly<Dataset.T>,
  apiOptions: Readonly<{
    fetchApiOpenDataResource?: DatasetParquetWrapperOptions["fetchApiOpenDataResource"];
    transcodeCsvToParquet?: DatasetParquetWrapperOptions["transcodeCsvToParquet"];
  }>,
): Promise<FetchedParquet> {
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
  if (catalogEntry?.accessKind === "api_resource") {
    return await _downloadApiOpenData({
      datasetId: dataset.id,
      catalogEntryId: catalogEntry.id,
      ...apiOptions,
    });
  }
  return await _downloadPipelineOpenDataParquet(dataset, catalogEntry ?? {});
}

async function _fetchParquetFromSource(
  ref: DatasetRef,
  getDataset: (id: Dataset.Id) => Promise<Dataset.T>,
  apiOptions: Readonly<{
    fetchApiOpenDataResource?: DatasetParquetWrapperOptions["fetchApiOpenDataResource"];
    transcodeCsvToParquet?: DatasetParquetWrapperOptions["transcodeCsvToParquet"];
  }>,
): Promise<FetchedParquet> {
  const dataset = await getDataset(ref.id);
  return match(dataset.sourceType)
    .with("csv_file", "xlsx_file", "pdf_file", async (sourceType) => {
      return {
        parquetBlob: await _downloadStoredParquet(dataset, sourceType),
        sourceVersion: undefined,
      };
    })
    .with("open_data", () => {
      return _downloadOpenDataParquet(dataset, apiOptions);
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
 * `csv_file`, `xlsx_file`, `pdf_file` and `open_data`. Each is downloaded
 * whole, because none of the four can be asked a question.
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
  const apiOptions = {
    fetchApiOpenDataResource: options.fetchApiOpenDataResource,
    transcodeCsvToParquet: options.transcodeCsvToParquet,
  };

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
      if (options.fetchParquet) {
        return {
          ref,
          parquetBlob: await options.fetchParquet(ref),
          sourceVersion: undefined,
        };
      }
      const fetched = await _fetchParquetFromSource(
        ref,
        getDataset,
        apiOptions,
      );
      return { ref, ...fetched };
    },
  };
}
