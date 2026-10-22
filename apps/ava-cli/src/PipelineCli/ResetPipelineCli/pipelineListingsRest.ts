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
  method: "HEAD" | "GET" | "DELETE" | "POST";
  table: string;
  params: Readonly<Record<string, string>>;
  prefer?: string;
  body?: unknown;
}): Promise<Response> {
  const { target, method, table, params, prefer, body } = options;
  const query = new URLSearchParams(params);
  const response = await fetch(`${target.apiUrl}/rest/v1/${table}?${query}`, {
    method,
    headers: {
      apikey: target.secretKey,
      Authorization: `Bearer ${target.secretKey}`,
      ...(prefer === undefined ? {} : { Prefer: prefer }),
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(
      `Supabase answered ${response.status} on ${method} ${table}: ${responseText}`,
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

/**
 * The most rows PostgREST returns from one request. A response this long
 * may have been cut short.
 */
const POSTGREST_MAX_ROWS = 1000;

/**
 * Finds every workspace dataset added from a listing `filter` selects.
 * Throws when the response may have been truncated, since a caller that
 * trusted a partial list would delete listings it never saw in use.
 */
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
  const inUseListings = (await response.json()) as readonly InUseListing[];
  if (inUseListings.length >= POSTGREST_MAX_ROWS) {
    throw new Error(
      `Found ${inUseListings.length} workspace datasets using these ` +
        `listings, PostgREST's ${POSTGREST_MAX_ROWS}-row limit, so the ` +
        "in-use list may be truncated. Nothing was deleted.",
    );
  }
  return inUseListings;
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

/** The checkpoints table, as PostgREST names it. */
const CHECKPOINTS_TABLE = "pipeline_scope_checkpoints";

/** The RPC that prunes one scope from a pipeline's listings. */
const PRUNE_SCOPE_RPC = "rpc/rpc_data_catalog_listings__prune_pipeline_scope";

/** The RPC that lists a pipeline's stored drive and scope pairs. */
const LIST_SCOPES_RPC = "rpc/rpc_data_catalog_listings__list_pipeline_scopes";

/** What pruning one scope did, or would do in a dry run. */
export type ScopePruneCounts = Readonly<{
  listings_deleted: number;
  listings_kept_in_use: number;
  listings_detached: number;
  checkpoints_deleted: number;
}>;

/** A drive and scope a pipeline has listings or a checkpoint for. */
export type StoredScope = Readonly<{ drive_key: string; scope_key: string }>;

/** Counts one pipeline's checkpoints. */
export async function countCheckpoints(options: {
  target: PostgrestTarget;
  pipelineName: string;
}): Promise<number> {
  const response = await _sendPostgrestRequest({
    target: options.target,
    method: "HEAD",
    table: CHECKPOINTS_TABLE,
    params: {
      pipeline_name: `eq.${options.pipelineName}`,
      select: "scope_key",
    },
    prefer: "count=exact",
  });
  return _countFromContentRange(response);
}

/**
 * Deletes every checkpoint of one pipeline. Resolves to how many were
 * deleted.
 */
export async function deleteCheckpoints(options: {
  target: PostgrestTarget;
  pipelineName: string;
}): Promise<number> {
  const response = await _sendPostgrestRequest({
    target: options.target,
    method: "DELETE",
    table: CHECKPOINTS_TABLE,
    params: { pipeline_name: `eq.${options.pipelineName}` },
    prefer: "return=minimal,count=exact",
  });
  return _countFromContentRange(response);
}

/**
 * Prunes one scope from a pipeline's listings and checkpoints, on one
 * drive or, with no `driveKey`, on every drive. A dry run only counts.
 * Listings a workspace uses are never deleted.
 */
export async function pruneScope(options: {
  target: PostgrestTarget;
  pipelineName: string;
  scopeKey: string;
  driveKey: string | undefined;
  isDryRun: boolean;
}): Promise<ScopePruneCounts> {
  const response = await _sendPostgrestRequest({
    target: options.target,
    method: "POST",
    table: PRUNE_SCOPE_RPC,
    params: {},
    body: {
      p_pipeline_name: options.pipelineName,
      p_scope_key: options.scopeKey,
      p_drive_key: options.driveKey ?? null,
      p_is_dry_run: options.isDryRun,
    },
  });
  const [counts] = (await response.json()) as readonly ScopePruneCounts[];
  if (counts === undefined) {
    throw new Error(`Supabase returned no counts from ${PRUNE_SCOPE_RPC}.`);
  }
  return counts;
}

/** Lists every drive and scope pair one pipeline has stored. */
export async function listStoredScopes(options: {
  target: PostgrestTarget;
  pipelineName: string;
}): Promise<readonly StoredScope[]> {
  const response = await _sendPostgrestRequest({
    target: options.target,
    method: "POST",
    table: LIST_SCOPES_RPC,
    params: {},
    body: { p_pipeline_name: options.pipelineName },
  });
  return (await response.json()) as readonly StoredScope[];
}

/**
 * Calls a database function through PostgREST with a JSON body, throwing on
 * a non-2xx answer.
 *
 * @param options.functionName - Such as `rpc_pipeline_executions__start`.
 */
export async function callPostgrestRpc(options: {
  target: PostgrestTarget;
  functionName: string;
  body: Readonly<Record<string, unknown>>;
}): Promise<Response> {
  return await _sendPostgrestRequest({
    target: options.target,
    method: "POST",
    table: `rpc/${options.functionName}`,
    params: {},
    body: options.body,
  });
}
