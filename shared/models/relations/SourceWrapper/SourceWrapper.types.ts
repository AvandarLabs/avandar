import type { Dataset } from "$/models/datasets/Dataset/Dataset.ts";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult.ts";
import type {
  RelationCapabilities,
  SourceVersion,
} from "$/models/relations/RelationCapabilities/RelationCapabilities.types.ts";
import type { RelationRef } from "$/models/relations/RelationRef/RelationRef.ts";
import type { RelationSchema } from "$/models/relations/RelationSchema/RelationSchema.types.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { ILogger } from "@avandar/logger";

/**
 * Ambient identity and services a wrapper needs. Injected, never imported, so
 * this module stays free of Avandar's auth and of any client singleton.
 */
export type WrapperContext = {
  workspaceId: Workspace.Id;
  logger: ILogger;
};

/**
 * Where the types of a relation's columns come from when its rows are
 * acquired as CSV, which carries no types of its own. Every wrapper that
 * acquires CSV has to choose, and the reader types the columns as told.
 *
 * - `source-schema`: the source declares each column's type in its own
 *   schema, as a database table does. Those types were read from the schema
 *   when the dataset was imported and stored with it, so each column is read
 *   as text and cast to its stored type. Nothing is guessed from the values,
 *   so a number column is always a number and a zip code like `02134` keeps
 *   its leading zero.
 * - `inferred`: the source declares no types, as a spreadsheet does, so
 *   DuckDB infers each column's type from its values.
 */
export type CsvColumnTypes = "source-schema" | "inferred";

/**
 * Reads one dataset's acquired CSV text into Parquet, typing its columns as
 * `columnTypes` says. Injected into each wrapper, already bound to the
 * caller's DuckDB lease, so wrappers stay free of DuckDB.
 */
export type RelationCsvReader = (
  params: Readonly<{
    datasetId: Dataset.Id;
    csvText: string;
    columnTypes: CsvColumnTypes;
  }>,
) => Promise<{ parquetBlob: Blob }>;

/** One relation's bytes, ready to load into the queryable relation cache. */
export type AcquiredRelation = {
  ref: RelationRef.T;
  parquetBlob: Blob;
  sourceVersion: SourceVersion | undefined;
  /**
   * How long these rows may be served from a cache before the source is
   * acquired again, in ms. Omitted for a source whose rows never change
   * under the dataset, such as an uploaded file.
   */
  maxAgeMs?: number;
};

/** A request to fetch a relation's rows. */
export type AcquireRequest<TRef extends RelationRef.T = RelationRef.T> = {
  ref: TRef;
  /**
   * The columns the caller needs, or `all`. A wrapper that can project at the
   * source should; the rest may ignore this and return every column, which is
   * always correct because a returned superset satisfies the request.
   */
  columns: readonly string[] | "all";
};

/** A request for the source itself to answer a query. */
export type PushDownRequest<TRef extends RelationRef.T = RelationRef.T> = {
  ref: TRef;
  sql: string;
};

/**
 * How one kind of source is asked for data. This is Wiederhold's wrapper: it
 * translates to and from one source's native, capability-limited interface,
 * and knows nothing about caching or authorization.
 */
export type SourceWrapper<TRef extends RelationRef.T = RelationRef.T> = {
  /** Stable identifier for logs, telemetry and the quota counter. */
  readonly name: string;

  /** What this source can and cannot be asked. */
  readonly capabilities: RelationCapabilities;

  /** Whether this wrapper handles the given reference. */
  handles: (ref: RelationRef.T) => ref is TRef;

  /** The relation's columns, without acquiring its rows. */
  describe: (ref: TRef, ctx: WrapperContext) => Promise<RelationSchema>;

  /** A token that changes when the source changes. */
  readFreshness?: (ref: TRef, ctx: WrapperContext) => Promise<SourceVersion>;

  /** Fetch rows. Present only when the capabilities declare acquisition. */
  acquire?: (
    req: AcquireRequest<TRef>,
    ctx: WrapperContext,
  ) => Promise<AcquiredRelation>;

  /** Ask the source to answer. Present only when pushdown is declared. */
  pushDown?: (
    req: PushDownRequest<TRef>,
    ctx: WrapperContext,
  ) => Promise<QueryResult.T<Record<string, unknown>>>;
};
