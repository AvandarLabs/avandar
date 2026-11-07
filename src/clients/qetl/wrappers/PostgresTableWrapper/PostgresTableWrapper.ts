import { GlobalAppConfig } from "$/config/GlobalAppConfig";
import {
  POSTGRES_MAX_BYTES_PER_ACQUIRE,
  PostgresCsvEstimate,
} from "$/connectors/postgres/PostgresCsvEstimate/PostgresCsvEstimate";
import { readDatasetRelationSchema } from "@/clients/qetl/wrappers/DatasetParquetWrapper/readDatasetRelationSchema";
import { acquirePostgresTableRelation } from "@/clients/qetl/wrappers/PostgresTableWrapper/acquirePostgresTableRelation";
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
 * Dependencies the Postgres wrapper closes over so it never imports a client
 * singleton, mirroring `GoogleSheetsWrapperOptions`. No access-token option:
 * the edge function call carries the caller's own Supabase session
 * (attached by `fetchEdgeFunctionRoute`), and the connection
 * credential never leaves the server. No
 * source-record option either: the edge function reads which connection and
 * table a dataset names from the dataset itself.
 */
export type PostgresTableWrapperOptions = {
  /**
   * Reads one relation's CSV and returns Parquet. Bound to the caller's
   * DuckDB lease so acquisition does not race the outer query.
   */
  readCsv: RelationCsvReader;

  /**
   * Injected transport for `acquirePostgresTableRelation`'s `rows` fetch;
   * omitted in production, where `fetch` is used.
   */
  rowsFetch?: EdgeFunctionFetch;
};

/**
 * Capability record for the Postgres connector.
 *
 * Byte-bounded (not `"unbounded"`, unlike Sheets): an arbitrary customer
 * table can be far larger than a Sheets export, and both the edge function
 * and the browser have to hold the result in memory. `maxBytesPerCall`
 * imports `POSTGRES_MAX_BYTES_PER_ACQUIRE` directly from
 * `shared/connectors/postgres/PostgresCsvEstimate/PostgresCsvEstimate.ts`,
 * the same module `createPostgresConnector.ts` enforces it from - one
 * constant, imported by both runtimes, not two numbers kept in sync by
 * convention. `maxRowsPerCall` is `PostgresCsvEstimate.postgresMaxRowsPerCall`
 * for the same reason: the edge function's own
 * `getRelationRows` derives its row cap from the exact same function, fed
 * the exact same per-column-type byte estimate, rather than this wrapper
 * advertising one row-cap derivation while the server enforces a different
 * one.
 */
const CAPABILITIES = {
  /** One dataset row is one table/view. */
  relations: "single",

  /** A relation is downloaded whole, as CSV, same as Sheets. */
  acquisitionUnit: { kind: "whole-relation" },

  /** No predicate or aggregate pushdown yet; a future revision can add it. */
  predicatePushdown: "none",
  aggregatePushdown: false,
  wholeRelationAcquirable: "yes",

  maxRowsPerCall: PostgresCsvEstimate.postgresMaxRowsPerCall,
  maxBytesPerCall: POSTGRES_MAX_BYTES_PER_ACQUIRE,

  /**
   * No freshness signal yet; a future revision can detect server-side
   * changes.
   */
  freshnessSignal: "none",

  /** A Postgres table has no positional identity; row order is not stable. */
  rowIdentity: "none",
  multiCallAtomicity: false,

  /** Own TCP connection per acquisition; no shared third-party quota. */
  quotaScope: { kind: "none" },

  /** No OAuth scope: a username/password behind Vault, not a granted scope. */
  grantedScope: [],
} satisfies RelationCapabilities;

async function _acquirePostgresTable(
  options: Readonly<{
    ref: DatasetRef;
    wrapperOptions: PostgresTableWrapperOptions;
  }>,
): Promise<AcquiredRelation> {
  const { ref, wrapperOptions } = options;
  const acquired = await acquirePostgresTableRelation({
    datasetId: ref.id,
    readCsv: async ({ csvText }) => {
      return await wrapperOptions.readCsv({
        datasetId: ref.id,
        csvText,
        // A Postgres table declares every column's type, which the
        // `connectors` edge function reads from `information_schema` at
        // import. The dataset stores those types, so the rows are read as
        // text and cast to them rather than guessed from the values.
        columnTypes: "source-schema",
      });
    },
    rowsFetch: wrapperOptions.rowsFetch,
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
  throw new Error("Postgres acquisition needs a CSV reader");
}

/**
 * Acquires one Postgres table/view as Parquet, downloading it as CSV through
 * the `connectors` edge function.
 *
 * `acquire` is present because the capabilities declare the relation
 * acquirable. The CSV reader arrives as an option, bound to the caller's
 * DuckDB lease, mirroring `GoogleSheetsWrapper`.
 */
export function createPostgresTableWrapper(
  options: Readonly<Partial<PostgresTableWrapperOptions>> = {},
): SourceWrapper<DatasetRef> {
  const wrapperOptions: PostgresTableWrapperOptions = {
    readCsv: options.readCsv ?? _missingReadCsv,
    rowsFetch: options.rowsFetch,
  };

  return {
    name: "postgres",
    capabilities: CAPABILITIES,

    handles: (ref): ref is DatasetRef => {
      return ref.kind === "dataset";
    },

    describe: async (ref) => {
      return await readDatasetRelationSchema(ref.id);
    },

    acquire: async ({ ref }) => {
      return await _acquirePostgresTable({ ref, wrapperOptions });
    },

    // `readFreshness` intentionally omitted: `freshnessSignal` is `"none"`,
    // so there is nothing yet to report; a future revision can add real
    // freshness detection here.
  };
}
