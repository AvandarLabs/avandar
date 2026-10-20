import type { ListingRowValues } from "@etl/stores/EtlStores.types";

/**
 * Asserts that every row in an `upsertRows` call has the same listing kind.
 * Each kind has its own conflict target, so a mixed call cannot be one
 * all-or-nothing write. Every listings store throws this same error.
 *
 * @param rows - The rows of one `upsertRows` call.
 * @throws When `rows` holds more than one listing kind.
 */
export function assertOneListingKind(rows: readonly ListingRowValues[]): void {
  const kinds = new Set(
    rows.map((row) => {
      return row.access_kind;
    }),
  );
  if (kinds.size > 1) {
    throw new Error(
      `upsertRows takes rows of one listing kind per call, and this call mixes ${[...kinds].join(" and ")} rows.`,
    );
  }
}
