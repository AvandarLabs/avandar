import { acquirePostgresTableRelation } from "@/clients/qetl/wrappers/PostgresTableWrapper/acquirePostgresTableRelation";
import { readDatasetRelationSchema } from "@/clients/qetl/wrappers/DatasetParquetWrapper/readDatasetRelationSchema";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { PostgresTableDataset } from "$/models/datasets/PostgresTableDataset/PostgresTableDataset";
import type { RelationCapabilities } from "$/models/relations/RelationCapabilities/RelationCapabilities.types";
import type { RelationRef } from "$/models/relations/RelationRef/RelationRef";
import type {
  AcquiredRelation,
  SourceWrapper,
} from "$/models/relations/SourceWrapper/SourceWrapper.types";
import type { PostgresRowsFetch } from "@/clients/qetl/wrappers/PostgresTableWrapper/acquirePostgresTableRelation";

type DatasetRef = Extract<RelationRef.T, { kind: "dataset" }>;

type PostgresTableSource = Pick<
  PostgresTableDataset.T,
  "connectionId" | "schemaName" | "tableName"
>;

type PostgresTableParquetRelation = { parquetBlob: Blob };

/**
 * Dependencies the Postgres wrapper closes over so it never imports a client
 * singleton, mirroring `GoogleSheetsWrapperOptions`. No access-token option:
 * unlike Sheets' third-party OAuth token, the edge function call carries the
 * caller's own Supabase session (attached in `acquirePostgresTableRelation.ts`
 * itself), and the connection credential never leaves the server.
 */
export type PostgresTableWrapperOptions = {
  /** The stored Postgres table row for one dataset. */
  getPostgresTableSource: (id: Dataset.Id) => Promise<PostgresTableSource>;

  /**
   * Reads one relation's CSV and returns Parquet. Bound to the caller's
   * DuckDB lease so acquisition does not race the outer query.
   */
  readCsv: (params: {
    datasetId: Dataset.Id;
    csvText: string;
  }) => Promise<PostgresTableParquetRelation>;

  /**
   * Injected transport for `acquirePostgresTableRelation`'s `rows` fetch;
   * omitted in production, where `fetch` is used.
   */
  rowsFetch?: PostgresRowsFetch;
};

/**
 * Capability record for the Postgres connector.
 *
 * Bounded (not `"unbounded"`, unlike Sheets): an arbitrary customer table can
 * be far larger than a Sheets export, and both the edge function and the
 * browser have to hold the result in memory. The cap values themselves are
 * declared and enforced server-side (`createPostgresConnector.ts`'s
 * `POSTGRES_MAX_ROWS_PER_ACQUIRE`/`POSTGRES_MAX_BYTES_PER_ACQUIRE`, under
 * `supabase/functions/external-datasets/connectors/postgres/`) - this
 * capability record mirrors the same two numbers so the mediator's
 * bookkeeping matches what the server will actually enforce. Keep these two
 * files in sync if either value ever changes.
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

  /** Mirrors `createPostgresConnector.ts`'s `POSTGRES_MAX_ROWS_PER_ACQUIRE`. */
  maxRowsPerCall: 200_000,

  /**
   * Mirrors `createPostgresConnector.ts`'s
   * `POSTGRES_MAX_BYTES_PER_ACQUIRE`.
   */
  maxBytesPerCall: 100 * 1024 * 1024,

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
  const source = await wrapperOptions.getPostgresTableSource(ref.id);
  const acquired = await acquirePostgresTableRelation({
    connectionId: source.connectionId,
    schemaName: source.schemaName,
    tableName: source.tableName,
    readCsv: async ({ csvText }) => {
      return await wrapperOptions.readCsv({ datasetId: ref.id, csvText });
    },
    rowsFetch: wrapperOptions.rowsFetch,
  });
  return {
    ref,
    parquetBlob: acquired.relation.parquetBlob,
    sourceVersion: acquired.sourceVersion,
  };
}

function _missingPostgresTableSource(): Promise<never> {
  throw new Error("Postgres acquisition needs the stored source record");
}

function _missingReadCsv(): Promise<never> {
  throw new Error("Postgres acquisition needs a CSV reader");
}

/**
 * Acquires one Postgres table/view as Parquet, downloading it as CSV through
 * the `external-datasets` edge function.
 *
 * `acquire` is present because the capabilities declare the relation
 * acquirable. The source record and CSV reader arrive as options so this
 * wrapper never re-reads what the relation loader already holds, mirroring
 * `GoogleSheetsWrapper`.
 */
export function createPostgresTableWrapper(
  options: Readonly<Partial<PostgresTableWrapperOptions>> = {},
): SourceWrapper<DatasetRef> {
  const wrapperOptions: PostgresTableWrapperOptions = {
    getPostgresTableSource:
      options.getPostgresTableSource ?? _missingPostgresTableSource,
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
