import { randomUUID } from "node:crypto";
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
    /** Every stored row, in the order its key was first written. */
    getRows: () => readonly StoredListingRow[];
    /** One listing's relation columns, as last replaced. */
    getRelationColumns: (
      listingId: string,
    ) => readonly RelationColumnRow[] | undefined;
    /** How many rows each `readRowsMatching` call asked for, in call order. */
    getReadBatchSizes: () => readonly number[];
    /** Every `upsertRows` payload, in call order. */
    getUpsertBatches: () => ReadonlyArray<readonly ListingRowValues[]>;
  }>;

function _readHighWaterMark(args: {
  rows: Iterable<StoredListingRow>;
  pipelineName: string;
  apiBaseUrl: string;
}): Date | undefined {
  const newest = [...args.rows].reduce<number | undefined>((max, row) => {
    const isInDrive =
      row.pipeline_name === args.pipelineName &&
      row.api_base_url === args.apiBaseUrl &&
      row.date_of_last_update !== null;
    if (!isInDrive) {
      return max;
    }
    const time = Date.parse(row.date_of_last_update ?? "");
    return max === undefined || time > max ? time : max;
  }, undefined);
  return newest === undefined ? undefined : new Date(newest);
}

/**
 * Creates a listings store that keeps rows in memory, for testing a pipeline
 * or the engine without Supabase. Upserts keep a row's id and merge over any
 * columns outside the contract, the way Postgres keeps columns an upsert
 * does not name.
 *
 * @param options.rows - Rows to start with.
 * @returns The store.
 */
export function createInMemoryListingsStore(
  options: Readonly<{ rows?: readonly StoredListingRow[] }> = {},
): InMemoryListingsStore {
  const rowsByKey = new Map<string, StoredListingRow>(
    (options.rows ?? []).map((row) => {
      return [buildListingKeyFromRow(row), row];
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
      return rows.flatMap((row) => {
        const stored = rowsByKey.get(buildListingKeyFromRow(row));
        return stored === undefined ? [] : [stored];
      });
    },
    upsertRows: async (rows) => {
      upsertBatches.push([...rows]);
      return rows.map((row) => {
        const key = buildListingKeyFromRow(row);
        const existing = rowsByKey.get(key);
        const stored = {
          ...existing,
          ...row,
          id: existing?.id ?? randomUUID(),
        };
        rowsByKey.set(key, stored);
        return stored;
      });
    },
    replaceRelationColumns: async ({ listingId, columns }) => {
      columnsByListingId.set(listingId, [...columns]);
    },
    getRows: () => {
      return [...rowsByKey.values()];
    },
    getRelationColumns: (listingId) => {
      return columnsByListingId.get(listingId);
    },
    getReadBatchSizes: () => {
      return [...readBatchSizes];
    },
    getUpsertBatches: () => {
      return [...upsertBatches];
    },
  };
}
