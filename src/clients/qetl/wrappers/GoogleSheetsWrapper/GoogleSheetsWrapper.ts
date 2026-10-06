import { acquireGoogleSheetRelation } from "@/clients/google/GoogleDriveClient/acquireGoogleSheetRelation";
import { getGoogleSheetFreshness } from "@/clients/google/GoogleDriveClient/googleSheetFreshness";
import { readDatasetRelationSchema } from "@/clients/qetl/wrappers/DatasetParquetWrapper/readDatasetRelationSchema";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { GoogleSheetsDataset } from "$/models/datasets/GoogleSheetsDataset/GoogleSheetsDataset";
import type { RelationCapabilities } from "$/models/relations/RelationCapabilities/RelationCapabilities.types";
import type { RelationRef } from "$/models/relations/RelationRef/RelationRef";
import type {
  AcquiredRelation,
  SourceWrapper,
} from "$/models/relations/SourceWrapper/SourceWrapper.types";
import type { GoogleDriveFetch } from "@/clients/google/GoogleDriveClient/GoogleDriveClient.types";

type DatasetRef = Extract<RelationRef.T, { kind: "dataset" }>;

type GoogleSheetSource = Pick<
  GoogleSheetsDataset.T,
  "googleDocumentId" | "sheetName" | "googleAccountId"
>;

type GoogleSheetParquetRelation = { parquetBlob: Blob };

/**
 * Dependencies the Sheets wrapper closes over so it never imports a client
 * singleton. The relation loader already holds the source record and the
 * DuckDB lease, and it passes both through here.
 */
export type GoogleSheetsWrapperOptions = {
  /** The stored Sheets row for one dataset. */
  getSheetSource: (id: Dataset.Id) => Promise<GoogleSheetSource>;

  /** A live Google access token for the stored account. */
  getAccessToken: () => Promise<string>;

  /**
   * Reads one tab's CSV and returns Parquet. Bound to the caller's DuckDB
   * lease so acquisition does not race the outer query. `datasetId` is the
   * bare table the lease already covers.
   */
  readCsv: (params: {
    datasetId: Dataset.Id;
    csvText: string;
  }) => Promise<GoogleSheetParquetRelation>;

  /** Injected Drive transport; omitted in production, where `fetch` is used. */
  driveFetch?: GoogleDriveFetch;
};

const CAPABILITIES = {
  /**
   * One dataset row is one tab. The tab lives on the source record rather
   * than on `RelationRef`, so a consumer cannot enumerate tabs from the ref.
   */
  relations: "single",

  /**
   * A tab is downloaded on its own, as CSV. Which tab becomes a relation is
   * decided before the download, not by reading a subrange out of it.
   */
  acquisitionUnit: { kind: "whole-relation" },

  predicatePushdown: "none",
  aggregatePushdown: false,
  wholeRelationAcquirable: "yes",
  maxRowsPerCall: "unbounded",

  /** Drive caps exported content at roughly 10 MB. */
  maxBytesPerCall: 10 * 1024 * 1024,

  /** Drive reports `File.version`, which changes when the file changes. */
  freshnessSignal: "version-token",

  /**
   * A sheet row has no key and no server-side identity: inserting a row above
   * it renumbers it. With `multiCallAtomicity: false` this is what makes
   * stitching two partial fetches into one relation unsound by declaration.
   */
  rowIdentity: "none",
  multiCallAtomicity: false,

  /**
   * Acquisition touches three Google hosts: Drive for the file version, the
   * Sheets API for the tab list, and the export host for the tab itself. Drive
   * is the one that rate-limits an acquisition loop, so it is the scope
   * declared here.
   */
  quotaScope: { kind: "per-host", host: "www.googleapis.com" },

  grantedScope: [
    "openid",
    "email",
    "https://www.googleapis.com/auth/drive.file",
  ],
} satisfies RelationCapabilities;

async function _acquireGoogleSheet(
  options: Readonly<{
    ref: DatasetRef;
    wrapperOptions: GoogleSheetsWrapperOptions;
  }>,
): Promise<AcquiredRelation> {
  const { ref, wrapperOptions } = options;
  const source = await wrapperOptions.getSheetSource(ref.id);
  const accessToken = await wrapperOptions.getAccessToken();
  const acquired = await acquireGoogleSheetRelation({
    fileId: source.googleDocumentId,
    accessToken,
    sheetName: source.sheetName,
    readCsv: async ({ csvText }) => {
      return await wrapperOptions.readCsv({ datasetId: ref.id, csvText });
    },
    driveFetch: wrapperOptions.driveFetch,
  });
  return {
    ref,
    parquetBlob: acquired.relation.parquetBlob,
    sourceVersion: acquired.sourceVersion,
  };
}

function _missingSheetSource(): Promise<never> {
  throw new Error("Google Sheets acquisition needs the stored source record");
}

function _missingAccessToken(): Promise<never> {
  throw new Error("No Google token is available for this user");
}

function _missingReadCsv(): Promise<never> {
  throw new Error("Google Sheets acquisition needs a CSV reader");
}

/**
 * Acquires one Google Sheets tab as Parquet, downloading that tab as CSV.
 *
 * `acquire` is present because the capabilities declare the relation
 * acquirable. The source record, token, and CSV reader arrive as options so
 * this wrapper never re-reads what the relation loader already holds.
 */
export function createGoogleSheetsWrapper(
  options: Readonly<Partial<GoogleSheetsWrapperOptions>> = {},
): SourceWrapper<DatasetRef> {
  const wrapperOptions: GoogleSheetsWrapperOptions = {
    getSheetSource: options.getSheetSource ?? _missingSheetSource,
    getAccessToken: options.getAccessToken ?? _missingAccessToken,
    readCsv: options.readCsv ?? _missingReadCsv,
    driveFetch: options.driveFetch,
  };

  return {
    name: "google-sheets",
    capabilities: CAPABILITIES,

    handles: (ref): ref is DatasetRef => {
      return ref.kind === "dataset";
    },

    describe: async (ref) => {
      return await readDatasetRelationSchema(ref.id);
    },

    acquire: async ({ ref }) => {
      return await _acquireGoogleSheet({ ref, wrapperOptions });
    },

    readFreshness: async (ref) => {
      const source = await wrapperOptions.getSheetSource(ref.id);
      return await getGoogleSheetFreshness({
        datasetId: ref.id,
        fileId: source.googleDocumentId,
        accessToken: await wrapperOptions.getAccessToken(),
        driveFetch: wrapperOptions.driveFetch,
      });
    },
  };
}
