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

  /** Hard row ceiling per call, which forces paging. */
  maxRowsPerCall: number | "unbounded";

  /**
   * Hard byte ceiling per call. Separate from the row ceiling because sources
   * cap different things: CKAN caps rows, Google Sheets caps response bytes.
   */
  maxBytesPerCall: number | "unbounded";

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
