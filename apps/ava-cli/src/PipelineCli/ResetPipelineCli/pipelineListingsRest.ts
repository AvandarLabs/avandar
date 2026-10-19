import { AvaEnv } from "@ava-cli/AvaEnv/AvaEnv";

/**
 * PostgREST query params, column to filter, that select the
 * `data_catalog_listings` rows one pipeline wrote.
 */
export type ListingFilter = Readonly<Record<string, string>>;

/** A workspace dataset that was added from one of a pipeline's listings. */
export type InUseListing = Readonly<{
  catalog_listing_id: string;
  dataset_id: string;
  workspace_id: string;
}>;

/** Where to send PostgREST requests, and the key that bypasses RLS. */
export type PostgrestTarget = Readonly<{ apiUrl: string; secretKey: string }>;

/** Reads the PostgREST target from the env file this invocation loaded. */
export function getPostgrestTarget(): PostgrestTarget {
  return {
    apiUrl: AvaEnv.requireVar("VITE_SUPABASE_API_URL").replace(/\/+$/, ""),
    secretKey: AvaEnv.requireVar("SUPABASE_SERVICE_ROLE_KEY"),
  };
}

/** Sends one PostgREST request, throwing on a non-2xx answer. */
async function _sendPostgrestRequest(options: {
  target: PostgrestTarget;
  method: "HEAD" | "GET" | "DELETE";
  table: string;
  params: Readonly<Record<string, string>>;
  prefer?: string;
}): Promise<Response> {
  const { target, method, table, params, prefer } = options;
  const query = new URLSearchParams(params);
  const response = await fetch(`${target.apiUrl}/rest/v1/${table}?${query}`, {
    method,
    headers: {
      apikey: target.secretKey,
      Authorization: `Bearer ${target.secretKey}`,
      ...(prefer === undefined ? {} : { Prefer: prefer }),
    },
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Supabase answered ${response.status} on ${method} ${table}: ${body}`,
    );
  }
  return response;
}

/** Reads the total out of a `Content-Range` header such as `0-9/42`. */
function _countFromContentRange(response: Response): number {
  const total = response.headers.get("content-range")?.split("/")[1];
  return total === undefined || total === "*" ? 0 : Number(total);
}

/** Counts the listings `filter` selects. */
export async function countListings(options: {
  target: PostgrestTarget;
  filter: ListingFilter;
}): Promise<number> {
  const response = await _sendPostgrestRequest({
    target: options.target,
    method: "HEAD",
    table: "data_catalog_listings",
    params: { ...options.filter, select: "id" },
    prefer: "count=exact",
  });
  return _countFromContentRange(response);
}

/** Finds every workspace dataset added from a listing `filter` selects. */
export async function findInUseListings(options: {
  target: PostgrestTarget;
  filter: ListingFilter;
}): Promise<readonly InUseListing[]> {
  // The `!inner` embed is what restricts the rows to this pipeline's
  // listings: a filter on an embedded table only drops parent rows when the
  // embed is an inner join.
  const embeddedFilter = Object.fromEntries(
    Object.entries(options.filter).map(([column, value]) => {
      return [`data_catalog_listings.${column}`, value];
    }),
  );
  const response = await _sendPostgrestRequest({
    target: options.target,
    method: "GET",
    table: "datasets__open_data",
    params: {
      select:
        "catalog_listing_id,dataset_id,workspace_id,data_catalog_listings!inner(id)",
      ...embeddedFilter,
    },
  });
  return (await response.json()) as readonly InUseListing[];
}

/**
 * Deletes workspace datasets by id. Their `datasets__open_data` rows, columns,
 * and other per-source rows go with them by cascade.
 */
export async function deleteDatasets(options: {
  target: PostgrestTarget;
  datasetIds: readonly string[];
}): Promise<void> {
  await _sendPostgrestRequest({
    target: options.target,
    method: "DELETE",
    table: "datasets",
    params: { id: `in.(${options.datasetIds.join(",")})` },
    prefer: "return=minimal",
  });
}

/**
 * Deletes the listings `filter` selects, except `keepListingIds`. Resolves to
 * how many were deleted.
 */
export async function deleteListings(options: {
  target: PostgrestTarget;
  filter: ListingFilter;
  keepListingIds: readonly string[];
}): Promise<number> {
  const { target, filter, keepListingIds } = options;
  const response = await _sendPostgrestRequest({
    target,
    method: "DELETE",
    table: "data_catalog_listings",
    params:
      keepListingIds.length === 0
        ? filter
        : { ...filter, id: `not.in.(${keepListingIds.join(",")})` },
    prefer: "return=minimal,count=exact",
  });
  return _countFromContentRange(response);
}
