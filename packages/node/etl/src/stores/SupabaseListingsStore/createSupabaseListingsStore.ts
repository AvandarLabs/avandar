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
 * Values per `.in(...)` filter. A read is a GET, and the API gateway rejects
 * a request URL over about 8 KB with "URI too long". A CKAN dataset name can
 * be 100 characters, so 50 of them keep the URL near 6 KB.
 */
const IN_FILTER_CHUNK_SIZE = 50;

type _Tables = Readonly<{
  client: SupabaseClient;
  listingsTable: string;
  relationColumnsTable: string;
}>;

function _throwOnError(args: {
  error: { message: string } | null;
  action: string;
}): void {
  if (args.error) {
    throw new Error(`Supabase failed ${args.action}: ${args.error.message}`);
  }
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

function _unique(values: ReadonlyArray<string | null>): string[] {
  return [
    ...new Set(
      values.filter((value): value is string => {
        return value !== null;
      }),
    ),
  ];
}

function _splitIntoInFilterChunks(values: readonly string[]): string[][] {
  return Array.from(
    { length: Math.ceil(values.length / IN_FILTER_CHUNK_SIZE) },
    (_, index) => {
      return values.slice(
        index * IN_FILTER_CHUNK_SIZE,
        (index + 1) * IN_FILTER_CHUNK_SIZE,
      );
    },
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
  args: _Tables & { pipelineName: string; apiBaseUrl: string },
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

async function _readGroupChunk(args: {
  tables: _Tables;
  first: ListingRowValues;
  keyValues: readonly string[];
}): Promise<readonly StoredListingRow[]> {
  const { first, keyValues } = args;
  const base = args.tables.client
    .from(args.tables.listingsTable)
    .select(SELECT_COLUMNS);
  const query =
    first.access_kind === "api_resource" ?
      base
        .eq("access_kind", "api_resource")
        .eq("api_service", first.api_service ?? "")
        .eq("api_base_url", first.api_base_url ?? "")
        .in("external_dataset_id", keyValues)
    : base
        .eq("access_kind", "pipeline_parquet")
        .eq("pipeline_name", first.pipeline_name)
        .in("parquet_file_name", keyValues);
  const { data, error } = await query;
  _throwOnError({
    error,
    action: `reading rows from ${args.tables.listingsTable}`,
  });
  return _toStoredRows(data);
}

async function _readGroup(args: {
  tables: _Tables;
  group: readonly ListingRowValues[];
}): Promise<readonly StoredListingRow[]> {
  const [first] = args.group;
  if (first === undefined) {
    return [];
  }
  const keyValues = _unique(
    args.group.map((row) => {
      return first.access_kind === "api_resource" ?
          row.external_dataset_id
        : row.parquet_file_name;
    }),
  );
  const storedChunks = await Promise.all(
    _splitIntoInFilterChunks(keyValues).map((chunk) => {
      return _readGroupChunk({ tables: args.tables, first, keyValues: chunk });
    }),
  );
  return storedChunks.flat();
}

async function _readRowsMatching(args: {
  tables: _Tables;
  rows: readonly ListingRowValues[];
}): Promise<readonly StoredListingRow[]> {
  // An API dataset's resources share an `external_dataset_id`, so a group
  // reads every resource of each dataset and the key filter keeps only the
  // ones asked for.
  const groups = _groupBy(args.rows, (row) => {
    return row.access_kind === "api_resource" ?
        JSON.stringify([row.access_kind, row.api_service, row.api_base_url])
      : JSON.stringify([row.access_kind, row.pipeline_name]);
  });
  const stored = await Promise.all(
    [...groups.values()].map((group) => {
      return _readGroup({ tables: args.tables, group });
    }),
  );
  const wantedKeys = new Set(args.rows.map(buildListingKeyFromRow));
  return stored.flat().filter((row) => {
    return wantedKeys.has(buildListingKeyFromRow(row));
  });
}

async function _upsertKind(args: {
  tables: _Tables;
  rows: readonly ListingRowValues[];
  onConflict: string;
}): Promise<readonly StoredListingRow[]> {
  if (args.rows.length === 0) {
    return [];
  }
  const { data, error } = await args.tables.client
    .from(args.tables.listingsTable)
    .upsert(
      args.rows.map((row) => {
        return { ...row };
      }),
      { onConflict: args.onConflict },
    )
    .select(SELECT_COLUMNS);
  _throwOnError({
    error,
    action: `upserting rows into ${args.tables.listingsTable}`,
  });
  return _toStoredRows(data);
}

async function _upsertRows(args: {
  tables: _Tables;
  rows: readonly ListingRowValues[];
}): Promise<readonly StoredListingRow[]> {
  // Each kind is one upsert statement, so a call with rows of one kind, as
  // the engine makes, is all-or-nothing.
  const apiRows = await _upsertKind({
    tables: args.tables,
    rows: args.rows.filter((row) => {
      return row.access_kind === "api_resource";
    }),
    onConflict: API_RESOURCE_CONFLICT,
  });
  const parquetRows = await _upsertKind({
    tables: args.tables,
    rows: args.rows.filter((row) => {
      return row.access_kind === "pipeline_parquet";
    }),
    onConflict: PIPELINE_PARQUET_CONFLICT,
  });
  return [...apiRows, ...parquetRows];
}

async function _replaceRelationColumns(args: {
  tables: _Tables;
  listingId: string;
  columns: readonly RelationColumnRow[];
}): Promise<void> {
  const { client, relationColumnsTable } = args.tables;
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
 * @param tables.client - A service-role client, since listings bypass RLS.
 * @param tables.listingsTable - The listings table.
 * @param tables.relationColumnsTable - The relation columns table.
 * @returns The store.
 */
export function createSupabaseListingsStore(tables: _Tables): ListingsStore {
  return {
    readHighWaterMark: (args) => {
      return _readHighWaterMark({ ...tables, ...args });
    },
    readRowsMatching: (rows) => {
      return _readRowsMatching({ tables, rows });
    },
    upsertRows: (rows) => {
      return _upsertRows({ tables, rows });
    },
    replaceRelationColumns: (args) => {
      return _replaceRelationColumns({ tables, ...args });
    },
  };
}
