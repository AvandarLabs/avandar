import { randomUUID } from "node:crypto";
import { buildListingKeyFromRow } from "@etl/stores/buildListingKeyFromRow/buildListingKeyFromRow";
import type {
  ListingsStore,
  ListingWithColumns,
  RelationColumnRow,
  StoredListingRow,
} from "@etl/stores/EtlStores.types";

/** A listings store held in memory, plus accessors for asserting on it. */
export type InMemoryListingsStore = ListingsStore &
  Readonly<{
    /** A copy of every stored row, in the order its key was first written. */
    getRows: () => readonly StoredListingRow[];
    /** A copy of one listing's relation columns, as last replaced. */
    getRelationColumns: (
      listingId: string,
    ) => readonly RelationColumnRow[] | undefined;
    /** How many rows each `readRowsMatching` call asked for, in call order. */
    getReadBatchSizes: () => readonly number[];
    /**
     * A copy of every stored `upsertListingsWithColumns` payload, in call
     * order.
     */
    getUpsertBatches: () => ReadonlyArray<readonly ListingWithColumns[]>;
  }>;

/**
 * Copies a value through JSON, so it crosses the store boundary the way a
 * Postgres write and read does: `undefined` keys vanish and a `Date` becomes
 * its ISO string. `undefined` stays `undefined`.
 */
function _copyThroughJson<T>(value: T): T {
  return value === undefined ? value : JSON.parse(JSON.stringify(value));
}

/**
 * Throws the errors `rpc_data_catalog_listings__upsert_with_relation_columns`
 * raises, before anything is written, so a refused call writes nothing.
 */
function _throwOnInvalidEntries(entries: readonly ListingWithColumns[]): void {
  const seenKeys = new Set<string>();
  entries.forEach(({ row, columns }) => {
    if (columns.length === 0) {
      throw new Error(
        `Listing "${row.display_name}" has no relation columns. A listing is never stored without its columns.`,
      );
    }
    const key = buildListingKeyFromRow(row);
    if (seenKeys.has(key)) {
      throw new Error(
        `Listing "${row.display_name}" appears twice in one call. Each listing may be written only once per call.`,
      );
    }
    seenKeys.add(key);
  });
}

/**
 * Creates a listings store that keeps rows in memory, for testing a pipeline
 * or the engine without Supabase. It behaves like Postgres where a pipeline
 * can tell the difference: upserts keep a row's id and merge over any columns
 * outside the contract, a call with a repeated key or with a listing that has
 * no columns fails whole, and every row crosses the store boundary as a JSON
 * copy.
 *
 * @param options.rows - Rows to start with.
 * @returns The store.
 */
export function createInMemoryListingsStore(
  options: Readonly<{ rows?: readonly StoredListingRow[] }> = {},
): InMemoryListingsStore {
  const rowsByKey = new Map<string, StoredListingRow>(
    (options.rows ?? []).map((row) => {
      return [buildListingKeyFromRow(row), _copyThroughJson(row)];
    }),
  );
  const columnsByListingId = new Map<string, readonly RelationColumnRow[]>();
  const readBatchSizes: number[] = [];
  const upsertBatches: Array<readonly ListingWithColumns[]> = [];

  return {
    readRowsMatching: async (rows) => {
      readBatchSizes.push(rows.length);
      const keys = new Set(
        rows.map((row) => {
          return buildListingKeyFromRow(row);
        }),
      );
      return _copyThroughJson(
        [...keys].flatMap((key) => {
          const stored = rowsByKey.get(key);
          return stored === undefined ? [] : [stored];
        }),
      );
    },
    upsertListingsWithColumns: async (entries) => {
      _throwOnInvalidEntries(entries);
      upsertBatches.push(_copyThroughJson([...entries]));
      return _copyThroughJson(
        entries.map(({ row, columns }) => {
          const key = buildListingKeyFromRow(row);
          const existing = rowsByKey.get(key);
          const stored = {
            ...existing,
            ..._copyThroughJson(row),
            id: existing?.id ?? randomUUID(),
          };
          rowsByKey.set(key, stored);
          columnsByListingId.set(stored.id, _copyThroughJson([...columns]));
          return stored;
        }),
      );
    },
    getRows: () => {
      return _copyThroughJson([...rowsByKey.values()]);
    },
    getRelationColumns: (listingId) => {
      return _copyThroughJson(columnsByListingId.get(listingId));
    },
    getReadBatchSizes: () => {
      return [...readBatchSizes];
    },
    getUpsertBatches: () => {
      return _copyThroughJson(upsertBatches);
    },
  };
}
