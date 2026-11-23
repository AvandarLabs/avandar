import { ConnectorError } from "@sbfn/connectors/Connector.ts";
import {
  POSTGRES_MAX_BYTES_PER_ACQUIRE,
  PostgresCsvEstimate,
} from "$/connectors/postgres/PostgresCsvEstimate/PostgresCsvEstimate.ts";
import { isWithinRelationCallCaps } from "$/models/relations/RelationCapabilities/isWithinRelationCallCaps.ts";
import type { RelationRowDescriptor } from "$/models/relations/RelationCapabilities/RelationCapabilities.types.ts";

/** Sizes to check against the shared Postgres cap contract. */
type PostgresCallCapsCheck = {
  rowCount: number;
  byteCount: number;
  descriptor: RelationRowDescriptor;

  /** Why the relation is refused, if it is over the caps. */
  message: string;
};

/**
 * Throws `too_large` unless `byteCount`/`rowCount` both stay within the
 * shared Postgres cap contract (`PostgresCsvEstimate.postgresMaxRowsPerCall`,
 * `POSTGRES_MAX_BYTES_PER_ACQUIRE`) for the relation `descriptor` describes -
 * the same contract `PostgresTableWrapper.ts`'s capability record advertises,
 * so the edge function enforces exactly what it advertises rather than a
 * second, separately-maintained threshold check.
 */
export function assertWithinPostgresCallCaps(
  options: Readonly<PostgresCallCapsCheck>,
): void {
  const withinCaps = isWithinRelationCallCaps({
    rowCount: options.rowCount,
    byteCount: options.byteCount,
    maxRowsPerCall: PostgresCsvEstimate.postgresMaxRowsPerCall,
    maxBytesPerCall: POSTGRES_MAX_BYTES_PER_ACQUIRE,
    descriptor: options.descriptor,
  });
  if (!withinCaps) {
    throw new ConnectorError("too_large", options.message);
  }
}
