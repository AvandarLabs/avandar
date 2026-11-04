import { GlobalAppConfig } from "$/config/GlobalAppConfig";
import { GOOGLE_SHEET_MAX_EXPORT_BYTES } from "$/connectors/googleSheets/GoogleDriveClient/GoogleDriveClient";
import { acquireGoogleSheetRelation } from "@/clients/google/GoogleDriveClient/acquireGoogleSheetRelation";
import { getGoogleSheetFreshness } from "@/clients/google/GoogleDriveClient/googleSheetFreshness";
import { GoogleSheetDatasetProxy } from "@/clients/google/GoogleSheetDatasetProxy/GoogleSheetDatasetProxy";
import { readDatasetRelationSchema } from "@/clients/qetl/wrappers/DatasetParquetWrapper/readDatasetRelationSchema";
import type { RelationCapabilities } from "$/models/relations/RelationCapabilities/RelationCapabilities.types";
import type { RelationRef } from "$/models/relations/RelationRef/RelationRef";
import type {
  AcquiredRelation,
  RelationCsvReader,
  SourceWrapper,
} from "$/models/relations/SourceWrapper/SourceWrapper.types";
import type { EdgeFunctionFetch } from "@/clients/fetchEdgeFunctionRoute/fetchEdgeFunctionRoute";

type DatasetRef = Extract<RelationRef.T, { kind: "dataset" }>;

/**
 * Dependencies the Sheets wrapper closes over so it never imports a client
 * singleton. The relation loader holds the DuckDB lease and passes it through
 * the CSV reader. No Google token is among them: the `google-sheets` edge
 * function reads the sheet with the grant of the account that added it.
 */
export type GoogleSheetsWrapperOptions = {
  /**
   * Reads one tab's CSV and returns Parquet. Bound to the caller's DuckDB
   * lease so acquisition does not race the outer query. `datasetId` is the
   * bare table the lease already covers.
   */
  readCsv: RelationCsvReader;

  /** Injected transport; omitted in production, where `fetch` is used. */
  datasetFetch?: EdgeFunctionFetch;
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
  maxBytesPerCall: GOOGLE_SHEET_MAX_EXPORT_BYTES,

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
   * Acquisition touches three Google hosts, from the `google-sheets` edge
   * function: Drive for the file version, the Sheets API for the tab list,
   * and the export host for the tab itself. Drive is the one that
   * rate-limits an acquisition loop, so it is the scope declared here.
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
  const acquired = await acquireGoogleSheetRelation({
    datasetId: ref.id,
    readCsv: async ({ csvText }) => {
      return await wrapperOptions.readCsv({
        datasetId: ref.id,
        csvText,
        // A sheet declares no column types, so DuckDB infers them from the
        // values, the same way the import did.
        columnTypes: "inferred",
      });
    },
    datasetFetch: wrapperOptions.datasetFetch,
  });
  return {
    ref,
    parquetBlob: acquired.relation.parquetBlob,
    sourceVersion: acquired.sourceVersion,
    // A live source: its rows can change without anyone re-importing it.
    maxAgeMs: GlobalAppConfig.timing.liveRelationMaxAgeMs,
  };
}

function _missingReadCsv(): Promise<never> {
  throw new Error("Google Sheets acquisition needs a CSV reader");
}

/**
 * Acquires one Google Sheets tab as Parquet, downloading that tab as CSV
 * through the `google-sheets` edge function.
 *
 * `acquire` is present because the capabilities declare the relation
 * acquirable. The CSV reader arrives as an option so this wrapper reads under
 * the DuckDB lease the relation loader already holds.
 */
export function createGoogleSheetsWrapper(
  options: Readonly<Partial<GoogleSheetsWrapperOptions>> = {},
): SourceWrapper<DatasetRef> {
  const wrapperOptions: GoogleSheetsWrapperOptions = {
    readCsv: options.readCsv ?? _missingReadCsv,
    datasetFetch: options.datasetFetch,
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
      return await getGoogleSheetFreshness({
        datasetId: ref.id,
        readVersion: () => {
          return GoogleSheetDatasetProxy.fetchVersion({
            datasetId: ref.id,
            datasetFetch: wrapperOptions.datasetFetch,
          });
        },
      });
    },
  };
}
