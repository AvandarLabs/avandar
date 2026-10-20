import { assertOneListingKind } from "@etl/stores/assertOneListingKind";
import { buildListingKeyFromRow } from "@etl/stores/buildListingKeyFromRow/buildListingKeyFromRow";
import { LISTING_CONTRACT_COLUMNS } from "@etl/stores/listingContractColumns";
import type {
  ListingRowValues,
  ListingsStore,
  RelationColumnRow,
  StoredListingRow,
} from "@etl/stores/EtlStores.types";
import type { SupabaseClient } from "@supabase/supabase-js";

const SELECT_COLUMNS = ["id", ...LISTING_CONTRACT_COLUMNS].join(",");
const API_RESOURCE_CONFLICT =
  "api_service,api_base_url,external_dataset_id,api_resource_id";
const PIPELINE_PARQUET_CONFLICT = "parquet_file_name,pipeline_name";

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

/** The Supabase client and table names a listings store reads and writes. */
export type SupabaseListingsStoreOptions = Readonly<{
  /** A service-role client, since listings bypass RLS. */
  client: SupabaseClient;
  /** The listings table. */
  listingsTable: string;
  /** The relation columns table. */
  relationColumnsTable: string;
}>;

type _KeyColumn = "external_dataset_id" | "api_resource_id" | "parquet_file_name";

type _SupabaseError = Readonly<{
  message: string;
  code?: string;
  details?: string | null;
  hint?: string | null;
}>;

function _throwOnError(args: {
  error: _SupabaseError | null;
  action: string;
}): void {
  const { error } = args;
  if (!error) {
    return;
  }
  const extras = [
    error.code ? `code ${error.code}` : "",
    error.details ? `details: ${error.details}` : "",
    error.hint ? `hint: ${error.hint}` : "",
  ].filter((extra) => {
    return extra !== "";
  });
  const suffix = extras.length === 0 ? "" : ` (${extras.join("; ")})`;
  throw new Error(`Supabase failed ${args.action}: ${error.message}${suffix}`, {
    cause: error,
  });
}

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

function _splitIntoReadChunks<T>(items: readonly T[]): T[][] {
  return Array.from(
    { length: Math.ceil(items.length / ROWS_PER_READ) },
    (_, index) => {
      return items.slice(index * ROWS_PER_READ, (index + 1) * ROWS_PER_READ);
    },
  );
}

function _pickContractColumns(
  row: ListingRowValues,
): Record<string, unknown> {
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
function _toStoredRows(data: unknown[] | null): StoredListingRow[] {
  return (data ?? []) as StoredListingRow[];
}

async function _readHighWaterMark(
  args: SupabaseListingsStoreOptions & {
    pipelineName: string;
    apiBaseUrl: string;
  },
): Promise<Date | undefined> {
  const { data, error } = await args.client
    .from(args.listingsTable)
    .select("date_of_last_update")
    .eq("pipeline_name", args.pipelineName)
    .eq("api_base_url", args.apiBaseUrl)
    .not("date_of_last_update", "is", null)
    .order("date_of_last_update", { ascending: false })
    .limit(1);
  _throwOnError({
    error,
    action: `reading the high-water mark from ${args.listingsTable}`,
  });
  const rows = (data ?? []) as ReadonlyArray<{ date_of_last_update: string }>;
  const newest = rows[0]?.date_of_last_update;
  return newest === undefined ? undefined : new Date(newest);
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
    first.access_kind === "api_resource" ?
      base
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
  _throwOnError({ error, action: `reading rows from ${options.listingsTable}` });
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
    return row.access_kind === "api_resource" ?
        JSON.stringify([row.access_kind, row.api_service, row.api_base_url])
      : JSON.stringify([row.access_kind, row.pipeline_name]);
  });
  const stored = await Promise.all(
    [...groups.values()].flatMap(_splitIntoReadChunks).map((rows) => {
      return _readChunk({ options: args.options, rows });
    }),
  );
  const wantedKeys = new Set(args.rows.map(buildListingKeyFromRow));
  return stored.flat().filter((row) => {
    return wantedKeys.has(buildListingKeyFromRow(row));
  });
}

async function _upsertRows(args: {
  options: SupabaseListingsStoreOptions;
  rows: readonly ListingRowValues[];
}): Promise<readonly StoredListingRow[]> {
  assertOneListingKind(args.rows);
  const [first] = args.rows;
  if (first === undefined) {
    return [];
  }
  // One upsert statement, so the call is all-or-nothing.
  const { data, error } = await args.options.client
    .from(args.options.listingsTable)
    .upsert(args.rows.map(_pickContractColumns), {
      onConflict:
        first.access_kind === "api_resource" ?
          API_RESOURCE_CONFLICT
        : PIPELINE_PARQUET_CONFLICT,
    })
    .select(SELECT_COLUMNS);
  _throwOnError({
    error,
    action: `upserting rows into ${args.options.listingsTable}`,
  });
  return _toStoredRows(data);
}

async function _replaceRelationColumns(args: {
  options: SupabaseListingsStoreOptions;
  listingId: string;
  columns: readonly RelationColumnRow[];
}): Promise<void> {
  const { client, relationColumnsTable } = args.options;
  const { error: deleteError } = await client
    .from(relationColumnsTable)
    .delete()
    .eq("catalog_listing_id", args.listingId);
  _throwOnError({
    error: deleteError,
    action: `deleting columns from ${relationColumnsTable}`,
  });
  if (args.columns.length === 0) {
    return;
  }
  const { error: insertError } = await client.from(relationColumnsTable).insert(
    args.columns.map((column) => {
      return { ...column, catalog_listing_id: args.listingId };
    }),
  );
  _throwOnError({
    error: insertError,
    action: `writing columns to ${relationColumnsTable}`,
  });
}

/**
 * Creates a listings store over two Supabase tables that satisfy the
 * engine's output contract (see the README). Every method throws with the
 * table name and Supabase's message when a request fails.
 *
 * @param options - The client and the two tables.
 * @returns The store.
 */
export function createSupabaseListingsStore(
  options: SupabaseListingsStoreOptions,
): ListingsStore {
  return {
    readHighWaterMark: (args) => {
      return _readHighWaterMark({ ...options, ...args });
    },
    readRowsMatching: (rows) => {
      return _readRowsMatching({ options, rows });
    },
    upsertRows: (rows) => {
      return _upsertRows({ options, rows });
    },
    replaceRelationColumns: (args) => {
      return _replaceRelationColumns({ options, ...args });
    },
  };
}
