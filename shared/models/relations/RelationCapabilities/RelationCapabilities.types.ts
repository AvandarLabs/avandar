/** The smallest thing one call to a source can fetch. */
export type AcquisitionUnit =
  | { kind: "whole-relation" }
  | { kind: "whole-range"; positionalSubranges: boolean }
  | { kind: "paged"; pageParam: string };

/** Who shares a source's rate limit. Project-global is the dangerous case. */
export type QuotaScope =
  | { kind: "none" }
  | { kind: "per-host"; host: string }
  | { kind: "project-global"; readsPerMinute: number }
  | { kind: "per-user"; readsPerMinute: number };

/** A source version token, compared for equality and never parsed. */
export type SourceVersion = string;

/**
 * A cheap, synchronous description of one relation's shape, known before any
 * row is read - enough for a per-call cap to vary with what is actually
 * being acquired, rather than declare one flat number for every relation a
 * source has regardless of its width.
 */
export type RelationRowDescriptor = {
  /** Number of columns the relation has. */
  columnCount: number;
  /**
   * The source's own best-effort estimate of one row's average serialized
   * width in bytes, when it can compute one from its own column metadata
   * (Postgres can, from `information_schema`; a source with no per-column
   * type information cannot, and omits this).
   */
  estimatedRowBytes?: number;
};

/**
 * A per-call ceiling: a flat number, `"unbounded"`, or a function of the
 * relation actually being acquired. A flat number does not describe a
 * source whose real limit is a byte budget divided by a row width that
 * varies relation to relation - Postgres's row cap, for one, is derived
 * this way rather than chosen as one number for every table (see
 * `PostgresTableWrapper.ts`).
 */
export type RelationCallCap =
  | number
  | "unbounded"
  | ((descriptor: RelationRowDescriptor) => number | "unbounded");

/**
 * What a source can and cannot be asked. The negative declarations carry the
 * weight: `rowIdentity: "none"` is what makes combining two partial fetches
 * from that source provably unsound, by declaration rather than by argument.
 */
export type RelationCapabilities = {
  /**
   * How many relations one `RelationRef` exposes. A dataset or a concept is
   * one; a Google spreadsheet is many, one per named tab.
   */
  relations: "single" | "named-tabs" | "tables";

  /** The smallest thing one call can fetch. Not what we want; what it gives. */
  acquisitionUnit: AcquisitionUnit;

  /** Whether a filter can be sent to the source, so it returns fewer rows. */
  predicatePushdown: "none" | "equality" | "range" | "full";

  /** Whether the source can compute an aggregate rather than return rows. */
  aggregatePushdown: boolean;

  /**
   * Whether the whole relation can be fetched. `probe` when it varies per
   * resource: one HDX dataset may offer a downloadable file while another
   * offers only a row-capped query endpoint.
   */
  wholeRelationAcquirable: "yes" | "no" | "probe";

  /**
   * Hard row ceiling per call, which forces paging. Independent of
   * `maxBytesPerCall`, not a fallback for it: when a source declares both as
   * real numbers (or as functions that resolve to real numbers for the
   * relation at hand), a caller must enforce both and refuse at whichever is
   * hit first. `"unbounded"` is how a source opts one axis out entirely
   * rather than leaving it undeclared - there is no third "not applicable"
   * state distinct from "no limit on this axis."
   */
  maxRowsPerCall: RelationCallCap;

  /**
   * Hard byte ceiling per call. Independent of `maxRowsPerCall` for the same
   * reason and under the same both-apply rule: sources cap different things
   * (CKAN caps rows, Google Sheets caps response bytes), and a source capping
   * both expects both checked, not whichever one a caller happened to read
   * first.
   */
  maxBytesPerCall: RelationCallCap;

  /** A cheap token that says the source changed, without refetching it. */
  freshnessSignal: "none" | "version-token" | "etag" | "modified-time";

  /** A per-row id stable across fetches. Without one, no delta and no union. */
  rowIdentity: "none" | "positional" | "stable-key";

  /** Whether several calls building one result see a single snapshot. */
  multiCallAtomicity: boolean;

  /** Who shares the rate limit. */
  quotaScope: QuotaScope;

  /** OAuth or API scopes actually granted, if any. */
  grantedScope: readonly string[];
};
