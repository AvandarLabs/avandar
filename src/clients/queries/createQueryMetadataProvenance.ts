/**
 * A stamp on a completed query's column metadata that tells which of two
 * results finished later in this browser session. Compare two stamps only
 * when their `session` matches, for example to keep an older or restored
 * result from overwriting newer column metadata.
 */
export type QueryMetadataProvenance = {
  session: symbol;
  sequence: number;
};

const session = Symbol("query-metadata-session");
let sequence: number = 0;

/**
 * Stamps a query result as it completes, with a sequence number above every
 * earlier stamp from this session, so two stamps never tie the way two
 * timestamps can. Use it wherever newer column metadata should win, for
 * example when a chart's column bindings take columns from its latest run.
 * JSON persistence drops the symbol, so a restored result never passes for
 * one from the current session.
 */
export function createQueryMetadataProvenance(): QueryMetadataProvenance {
  sequence += 1;
  return { session, sequence };
}
