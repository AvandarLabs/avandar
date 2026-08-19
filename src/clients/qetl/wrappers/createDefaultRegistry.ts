import { where } from "@avandar/utils";
import { match } from "ts-pattern";
import { APIClient } from "@/clients/APIClient";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { GoogleSheetsDatasetClient } from "@/clients/datasets/source-datasets/GoogleSheetsDatasetClient";
import { createRelationRegistry } from "@/clients/qetl/RelationRegistry/RelationRegistry";
import { createConceptWrapper } from "@/clients/qetl/wrappers/ConceptWrapper/ConceptWrapper";
import { createDatasetParquetWrapper } from "@/clients/qetl/wrappers/DatasetParquetWrapper/DatasetParquetWrapper";
import { createGoogleSheetsWrapper } from "@/clients/qetl/wrappers/GoogleSheetsWrapper/GoogleSheetsWrapper";
import { createVirtualDatasetWrapper } from "@/clients/qetl/wrappers/VirtualDatasetWrapper/VirtualDatasetWrapper";
import { AvaQueryClient } from "@/config/AvaQueryClient";
import { fetchOpenDataCatalogResource } from "@/lib/openData/fetchOpenDataCatalogResource";
import type { RelationRegistry } from "@/clients/qetl/RelationRegistry/RelationRegistry";
import type { FetchedApiOpenDataResource } from "@/clients/qetl/wrappers/DatasetParquetWrapper/DatasetParquetWrapper";
import type { GoogleSheetsWrapperOptions } from "@/clients/qetl/wrappers/GoogleSheetsWrapper/GoogleSheetsWrapper";
import type { OpenDataCatalogEntry } from "$/models/catalog-entries/OpenDataCatalogEntry/OpenDataCatalogEntry";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { RelationCapabilities } from "$/models/relations/RelationCapabilities/RelationCapabilities.types";
import type { RelationRef } from "$/models/relations/RelationRef/RelationRef";
import type {
  AcquiredRelation,
  SourceWrapper,
} from "$/models/relations/SourceWrapper/SourceWrapper.types";

type DatasetRef = Extract<RelationRef.T, { kind: "dataset" }>;

/**
 * Options the registry closes over, one registry per query.
 *
 * Nothing here carries a workspace. `WrapperContext.workspaceId` is supplied
 * per relation by the caller, taken from the dataset record, because the
 * relation-loading seam has no workspace in scope: `QetlRunnerOptions` carries
 * none and the public session has no workspace at all. Deriving it per
 * relation is what lets both sessions share one path.
 */
export type DefaultRegistryOptions = {
  /**
   * Runs a nested QETL query and returns Parquet bytes. A virtual dataset's
   * defining SQL is itself a QETL query, so this must be bound per query with
   * the caller's `datasetDuckDbLease` closed over, or the nested query races
   * the outer one on the shared queryable relation cache.
   */
  runParquetQuery: (options: Readonly<{ rawSql: string }>) => Promise<Blob>;

  /**
   * Resolves a dataset record, shared by the composite and by the wrappers it
   * delegates to so one relation costs one read. The relation loader already
   * holds
   * every dataset it is about to acquire, so it passes them straight through;
   * without this the cutover would add reads the old dispatch never made.
   */
  getDataset?: (id: Dataset.Id) => Promise<Dataset.T>;

  /**
   * Resolves a virtual dataset's defining SQL. Injected for the same reason as
   * `getDataset`: the relation loader already holds the virtual source record,
   * and
   * re-reading it here would add a query the old dispatch never made.
   */
  getRawSql?: (ref: DatasetRef) => Promise<string>;

  /** The stored Sheets row for one dataset. */
  getGoogleSheetsSource?: GoogleSheetsWrapperOptions["getSheetSource"];

  /** A live Google access token for the stored account. */
  getGoogleAccessToken?: GoogleSheetsWrapperOptions["getAccessToken"];

  /** Reads one Sheets tab under the caller's DuckDB lease. */
  readGoogleSheetXlsx?: GoogleSheetsWrapperOptions["readXlsx"];

  /** Fetches one API-backed catalog resource through the open-data proxy. */
  fetchApiOpenDataResource?: (
    catalogEntryId: OpenDataCatalogEntry.Id,
  ) => Promise<FetchedApiOpenDataResource>;

  /** Transcodes CSV bytes into Parquet under the caller's DuckDB lease. */
  transcodeCsvToParquet?: (params: {
    datasetId: Dataset.Id;
    bytes: Uint8Array<ArrayBuffer>;
  }) => Promise<Blob>;
};

/**
 * What every `dataset` relation can be asked, regardless of its source type.
 *
 * A `RelationRef` names a kind and an id, and the registry allows one wrapper
 * per kind, but `csv_file`, `xlsx_file`, `pdf_file`, `open_data`, `virtual` and
 * `google_sheets` are six sources behind that one kind. Their capabilities are
 * not identical, so this record states the values that hold for all six and
 * the composite delegates the rest.
 *
 * Every field below is chosen to preserve today's behaviour rather than to
 * describe the most capable source, because the only decision the mediator
 * makes from this record in Phase 1 is acquire versus push down, and all six
 * sources are acquire-only. Where a source is stricter than this record says,
 * its own wrapper still enforces it: Google Sheets caps a call at 10 MB and
 * shares a project-global quota, and its wrapper declares both. Specs 4 and 5
 * are what make per-source-type capabilities load-bearing, and that is when
 * this flattening has to be replaced by resolution finer than the relation
 * kind.
 */
const DATASET_CAPABILITIES = {
  /** One dataset row is one relation, including one Google Sheets tab. */
  relations: "single",

  acquisitionUnit: { kind: "whole-relation" },

  /**
   * None of the six can be asked a question. A stored Parquet blob answers
   * nothing, a virtual dataset's SQL is fixed at definition time, and the
   * Sheets `values.get` range is positional rather than a predicate.
   */
  predicatePushdown: "none",
  aggregatePushdown: false,

  wholeRelationAcquirable: "yes",

  /**
   * `unbounded` rather than the 10 MB Sheets ceiling. Flattening to the
   * smaller value would tell the engine it cannot fetch a large CSV, which is
   * a behaviour change; the Sheets wrapper enforces its own ceiling instead.
   */
  maxRowsPerCall: "unbounded",
  maxBytesPerCall: "unbounded",

  /** No composite-level freshness, so it exposes no `readFreshness`. */
  freshnessSignal: "none",

  /** A virtual dataset's SQL may reorder rows, so position is not identity. */
  rowIdentity: "none",

  /** False is the safe value: a Sheets export can straddle a live edit. */
  multiCallAtomicity: false,

  /** The composite itself consumes no third-party quota. */
  quotaScope: { kind: "none" },

  /** The composite needs no OAuth scope; the Sheets wrapper declares its. */
  grantedScope: [],
} satisfies RelationCapabilities;

async function _getGoogleSheetsSource(id: Dataset.Id): Promise<{
  googleDocumentId: string;
  sheetName: string | null;
  googleAccountId: string;
}> {
  const sources = await GoogleSheetsDatasetClient.withCache(AvaQueryClient)
    .withEnsureQueryData()
    .getAll(where("dataset_id", "in", [id]));
  const source = sources[0];
  if (!source) {
    throw new Error(`No Google Sheets source record for dataset '${id}'`);
  }
  return source;
}

async function _getGoogleAccessToken(): Promise<string> {
  const { tokens } = await APIClient.get({ route: "google-auth/tokens" });
  const accessToken = tokens[0]?.access_token;
  if (accessToken === undefined) {
    throw new Error("No Google token is available for this user");
  }
  return accessToken;
}

async function _getDataset(id: Dataset.Id): Promise<Dataset.T> {
  const datasets = await DatasetClient.withCache(AvaQueryClient)
    .withEnsureQueryData()
    .getAll(where("id", "in", [id]));
  const dataset = datasets[0];
  if (!dataset) {
    throw new Error(`No dataset found for relation '${id}'`);
  }
  return dataset;
}

/**
 * One wrapper for the `dataset` relation kind, delegating by source type.
 *
 * The registry dispatches on `RelationRef.kind` and rejects two wrappers
 * claiming one kind, but a dataset's source type is stored rather than encoded
 * in its reference. So the source-type decision has to happen after a read,
 * which is what this composite does, and it is the one place that knows the
 * mapping. Adding a source type is an entry in this match plus a wrapper, and
 * no other file changes.
 */
function _createDatasetWrapper(
  delegates: Readonly<{
    parquet: SourceWrapper<DatasetRef>;
    virtual: SourceWrapper<DatasetRef>;
    googleSheets: SourceWrapper<DatasetRef>;
    getDataset: (id: Dataset.Id) => Promise<Dataset.T>;
  }>,
): SourceWrapper<DatasetRef> {
  const delegateFor = async (
    ref: DatasetRef,
  ): Promise<SourceWrapper<DatasetRef>> => {
    const dataset = await delegates.getDataset(ref.id);
    return match(dataset.sourceType)
      .with("csv_file", "xlsx_file", "pdf_file", "open_data", () => {
        return delegates.parquet;
      })
      .with("virtual", () => {
        return delegates.virtual;
      })
      .with("google_sheets", () => {
        return delegates.googleSheets;
      })
      .exhaustive();
  };

  return {
    name: "dataset",
    capabilities: DATASET_CAPABILITIES,

    handles: (ref): ref is DatasetRef => {
      return ref.kind === "dataset";
    },

    describe: async (ref, ctx) => {
      const delegate = await delegateFor(ref);
      return await delegate.describe(ref, ctx);
    },

    acquire: async (req, ctx): Promise<AcquiredRelation> => {
      const delegate = await delegateFor(req.ref);
      if (!delegate.acquire) {
        throw new Error(
          `Wrapper '${delegate.name}' cannot acquire relation '${req.ref.id}'`,
        );
      }
      return await delegate.acquire(req, ctx);
    },
  };
}

/**
 * The wrappers the application runs with, one registry per query session.
 *
 * Two wrappers are registered because there are two relation kinds. The six
 * dataset source types sit behind one composite, so the registry's
 * one-wrapper-per-kind invariant holds without collapsing their behaviour.
 */
export function createDefaultRegistry(
  options: Readonly<DefaultRegistryOptions>,
): RelationRegistry {
  const getDataset = options.getDataset ?? _getDataset;

  return createRelationRegistry([
    _createDatasetWrapper({
      getDataset,
      parquet: createDatasetParquetWrapper({
        getDataset,
        fetchApiOpenDataResource:
          options.fetchApiOpenDataResource ?? fetchOpenDataCatalogResource,
        transcodeCsvToParquet: options.transcodeCsvToParquet,
      }),
      virtual: createVirtualDatasetWrapper({
        runParquetQuery: options.runParquetQuery,
        getRawSql: options.getRawSql,
      }),
      googleSheets: createGoogleSheetsWrapper({
        getSheetSource: options.getGoogleSheetsSource ?? _getGoogleSheetsSource,
        getAccessToken: options.getGoogleAccessToken ?? _getGoogleAccessToken,
        readXlsx: options.readGoogleSheetXlsx,
      }),
    }),
    createConceptWrapper(),
  ]);
}
