import type { ILogger } from "@avandar/logger";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type {
  RelationCapabilities,
  SourceVersion,
} from "$/models/relations/RelationCapabilities/RelationCapabilities.types.ts";
import type { RelationRef } from "$/models/relations/RelationRef/RelationRef.ts";
import type { RelationSchema } from "$/models/relations/RelationSchema/RelationSchema.types.ts";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult.ts";

/**
 * Ambient identity and services a wrapper needs. Injected, never imported, so
 * this module stays free of Avandar's auth and of any client singleton.
 */
export type WrapperContext = {
  workspaceId: Workspace.Id;
  logger: ILogger;
};

/** One relation's bytes, ready to load into the queryable relation cache. */
export type AcquiredRelation = {
  ref: RelationRef.T;
  parquetBlob: Blob;
  sourceVersion: SourceVersion | undefined;
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
