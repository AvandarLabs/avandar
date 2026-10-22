import { buildListingKeyFromRow } from "@etl/stores/buildListingKeyFromRow/buildListingKeyFromRow";
import { LISTING_CONTRACT_COLUMNS } from "@etl/stores/listingContractColumns";
import { throwOnSupabaseError } from "@etl/stores/throwOnSupabaseError/throwOnSupabaseError";
import { splitIntoChunks } from "@etl/utils/splitIntoChunks/splitIntoChunks";
import type {
  ListingRowValues,
  ListingsStore,
  ListingWithColumns,
  StoredListingRow,
} from "@etl/stores/EtlStores.types";
import type { SupabaseClient } from "@supabase/supabase-js";

const SELECT_COLUMNS = ["id", ...LISTING_CONTRACT_COLUMNS].join(",");

/**
 * Rows per read. A read is a GET whose URL lists the rows' dataset ids and
 * resource ids, and the API gateway rejects a URL over about 8 KB with "URI
 * too long". With 100-character ids in both lists, 25 rows measure 5,760
 * characters.
 */
const ROWS_PER_READ = 25;

/**
 * PostgREST's default `max_rows`. A read that returns this many rows may have
 * been cut short, and PostgREST does not say so.
 */
const POSTGREST_MAX_ROWS = 1000;

/** The Supabase client, table, and function a listings store uses. */
export type SupabaseListingsStoreOptions = Readonly<{
  /** A service-role client, since listings bypass RLS. */
  client: SupabaseClient;
  /** The listings table, which reads select from. */
  listingsTable: string;
  /**
   * The database function writes call. It takes `p_listings`, a JSON array
   * of `{ listing, relation_columns }`, writes it in one transaction, and
   * returns the stored listings.
   */
  upsertListingsFunction: string;
}>;

type _KeyColumn =
  | "external_dataset_id"
  | "api_resource_id"
  | "parquet_file_name";

function _groupBy<T>(
  items: readonly T[],
  getKey: (item: T) => string,
): ReadonlyMap<string, readonly T[]> {
  const groups = new Map<string, T[]>();
  items.forEach((item) => {
    const key = getKey(item);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  });
  return groups;
}

function _uniqueValues(
  rows: readonly ListingRowValues[],
  column: _KeyColumn,
): string[] {
  return [
    ...new Set(
      rows.flatMap((row) => {
        const value = row[column];
        return value === null ? [] : [value];
      }),
    ),
  ];
}

function _pickContractColumns(row: ListingRowValues): Record<string, unknown> {
  return Object.fromEntries(
    LISTING_CONTRACT_COLUMNS.map((column) => {
      return [column, row[column]];
    }),
  );
}

/**
 * Casts rows a select returned to stored listing rows. Although the type says
 * otherwise, the table allows `null` in `pipeline_name`, `date_of_last_sync`,
 * and `external_dataset_id`, so a hand-curated listing, or an API listing the
 * `pipeline_name` backfill has not reached, may carry one. The change check
 * handles a `null` in those columns.
 */
function _toStoredRows(data: unknown): StoredListingRow[] {
  return (data ?? []) as StoredListingRow[];
}

async function _readChunk(args: {
  options: SupabaseListingsStoreOptions;
  rows: readonly ListingRowValues[];
}): Promise<readonly StoredListingRow[]> {
  const { options, rows } = args;
  const [first] = rows;
  if (first === undefined) {
    return [];
  }
  const base = options.client
    .from(options.listingsTable)
    .select(SELECT_COLUMNS);
  const query =
    first.access_kind === "api_resource"
      ? base
          .eq("access_kind", "api_resource")
          .eq("api_service", first.api_service ?? "")
          .eq("api_base_url", first.api_base_url ?? "")
          .in("external_dataset_id", _uniqueValues(rows, "external_dataset_id"))
          .in("api_resource_id", _uniqueValues(rows, "api_resource_id"))
      : base
          .eq("access_kind", "pipeline_parquet")
          .eq("pipeline_name", first.pipeline_name)
          .in("parquet_file_name", _uniqueValues(rows, "parquet_file_name"));
  const { data, error } = await query;
  throwOnSupabaseError({
    error,
    action: `reading rows from ${options.listingsTable}`,
  });
  const stored = _toStoredRows(data);
  if (stored.length >= POSTGREST_MAX_ROWS) {
    throw new Error(
      `Reading rows from ${options.listingsTable} returned ${stored.length} rows, PostgREST's row cap, so the result may be missing rows.`,
    );
  }
  return stored;
}

async function _readRowsMatching(args: {
  options: SupabaseListingsStoreOptions;
  rows: readonly ListingRowValues[];
}): Promise<readonly StoredListingRow[]> {
  // One read matches every pairing of its rows' dataset ids and resource
  // ids, so it can return a stored row nobody asked for. The key filter keeps
  // only the ones asked for.
  const groups = _groupBy(args.rows, (row) => {
    return row.access_kind === "api_resource"
      ? JSON.stringify([row.access_kind, row.api_service, row.api_base_url])
      : JSON.stringify([row.access_kind, row.pipeline_name]);
  });
  const stored = await Promise.all(
    [...groups.values()]
      .flatMap((group) => {
        return splitIntoChunks(group, ROWS_PER_READ);
      })
      .map((rows) => {
        return _readChunk({ options: args.options, rows });
      }),
  );
  const wantedKeys = new Set(args.rows.map(buildListingKeyFromRow));
  return stored.flat().filter((row) => {
    return wantedKeys.has(buildListingKeyFromRow(row));
  });
}

async function _upsertListingsWithColumns(args: {
  options: SupabaseListingsStoreOptions;
  entries: readonly ListingWithColumns[];
}): Promise<readonly StoredListingRow[]> {
  if (args.entries.length === 0) {
    return [];
  }
  const { client, upsertListingsFunction } = args.options;
  // PostgREST caps a function's returned rows as it caps a select's, so a
  // larger call would store every listing and return only some of them.
  if (args.entries.length > POSTGREST_MAX_ROWS) {
    throw new Error(
      `upsertListingsWithColumns takes at most ${POSTGREST_MAX_ROWS} listings per call, PostgREST's row cap, and this call has ${args.entries.length}.`,
    );
  }
  // One function call is one transaction, so every listing in it is stored
  // with its columns, or none is.
  const { data, error } = await client
    .rpc(upsertListingsFunction, {
      p_listings: args.entries.map(({ row, columns }) => {
        return {
          listing: _pickContractColumns(row),
          relation_columns: columns,
        };
      }),
    })
    .select(SELECT_COLUMNS);
  throwOnSupabaseError({
    error,
    action: `upserting listings with ${upsertListingsFunction}`,
  });
  return _toStoredRows(data);
}

/**
 * Creates a listings store over the Supabase listings table and the function
 * that writes it, which satisfy the engine's output contract (see the
 * README). Every method throws with the table or function name and
 * Supabase's message when a request fails.
 *
 * @param options - The client, the listings table, and the write function.
 * @returns The store.
 */
export function createSupabaseListingsStore(
  options: SupabaseListingsStoreOptions,
): ListingsStore {
  return {
    readRowsMatching: (rows) => {
      return _readRowsMatching({ options, rows });
    },
    upsertListingsWithColumns: (entries) => {
      return _upsertListingsWithColumns({ options, entries });
    },
  };
}
