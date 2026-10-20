import { randomUUID } from "node:crypto";
import { assertOneListingKind } from "@etl/stores/assertOneListingKind";
import { buildListingKeyFromRow } from "@etl/stores/buildListingKeyFromRow/buildListingKeyFromRow";
import type {
  ListingRowValues,
  ListingsStore,
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
    /** A copy of every stored `upsertRows` payload, in call order. */
    getUpsertBatches: () => ReadonlyArray<readonly ListingRowValues[]>;
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
 * The newest parseable `date_of_last_update` no later than now, as the
 * Supabase store reads it: a later date is a bad source timestamp.
 */
function _readHighWaterMark(args: {
  rows: Iterable<StoredListingRow>;
  pipelineName: string;
  apiBaseUrl: string;
}): Date | undefined {
  const now = Date.now();
  const times = [...args.rows].flatMap((row) => {
    if (
      row.pipeline_name !== args.pipelineName ||
      row.api_base_url !== args.apiBaseUrl ||
      row.date_of_last_update === null
    ) {
      return [];
    }
    const time = Date.parse(row.date_of_last_update);
    return Number.isNaN(time) || time > now ? [] : [time];
  });
  return times.length === 0 ?
      undefined
    : new Date(
        times.reduce((newest, time) => {
          return Math.max(newest, time);
        }),
      );
}

function _throwOnRepeatedKey(rows: readonly ListingRowValues[]): void {
  const keys = rows.map((row) => {
    return buildListingKeyFromRow(row);
  });
  if (new Set(keys).size < keys.length) {
    throw new Error(
      "ON CONFLICT DO UPDATE command cannot affect row a second time",
    );
  }
}

/**
 * Creates a listings store that keeps rows in memory, for testing a pipeline
 * or the engine without Supabase. It behaves like Postgres where a pipeline
 * can tell the difference: upserts keep a row's id and merge over any columns
 * outside the contract, a batch with a repeated key or with more than one
 * listing kind fails whole, and every row crosses the store boundary as a
 * JSON copy.
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
  const upsertBatches: Array<readonly ListingRowValues[]> = [];

  return {
    readHighWaterMark: async ({ pipelineName, apiBaseUrl }) => {
      return _readHighWaterMark({
        rows: rowsByKey.values(),
        pipelineName,
        apiBaseUrl,
      });
    },
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
    upsertRows: async (rows) => {
      assertOneListingKind(rows);
      _throwOnRepeatedKey(rows);
      upsertBatches.push(_copyThroughJson([...rows]));
      return _copyThroughJson(
        rows.map((row) => {
          const key = buildListingKeyFromRow(row);
          const existing = rowsByKey.get(key);
          const stored = {
            ...existing,
            ..._copyThroughJson(row),
            id: existing?.id ?? randomUUID(),
          };
          rowsByKey.set(key, stored);
          return stored;
        }),
      );
    },
    replaceRelationColumns: async ({ listingId, columns }) => {
      columnsByListingId.set(listingId, _copyThroughJson([...columns]));
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
