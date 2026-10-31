/** Runtime-only ordering evidence for completed query metadata. */
export type QueryMetadataProvenance = {
  session: symbol;
  sequence: number;
};

const session = Symbol("query-metadata-session");
let sequence: number = 0;

/**
 * Orders completions independently of wall-clock precision. JSON persistence
 * drops the symbol, so restored rows cannot claim current-session provenance.
 */
export function createQueryMetadataProvenance(): QueryMetadataProvenance {
  sequence += 1;
  return { session, sequence };
}
