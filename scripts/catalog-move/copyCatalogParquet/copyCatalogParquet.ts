import { createHash } from "node:crypto";
import { createInterface } from "node:readline/promises";
import { pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "$/types/database.types";

/** The bucket that holds the catalog's Parquet objects. */
const OPEN_DATA_BUCKET = "opendata";

/** The bucket folder every prebuilt copy lives under. */
const CATALOG_CACHE_FOLDER = "catalog-cache";

/**
 * How many objects one Storage list call asks for. A server may return fewer,
 * so paging stops only on an empty page.
 */
const STORAGE_PAGE_SIZE = 1000;

/**
 * How many listings one target read asks for. The API's `max_rows` may cap
 * it lower, so paging stops only on an empty page.
 */
const LISTING_PAGE_SIZE = 1000;

/** The content type every pipeline uploads Parquet with. */
const PARQUET_CONTENT_TYPE = "application/vnd.apache.parquet";

/** One year, in seconds: a prebuilt copy's part never changes. */
const CACHE_PART_CACHE_CONTROL_SECONDS = "31536000";

/**
 * The cache time pipelines upload `pipeline_parquet` objects with, Storage's
 * default, since a pipeline run replaces the object at the same path.
 */
const PIPELINE_OBJECT_CACHE_CONTROL_SECONDS = "3600";

/** The flag that confirms the target host without a typed prompt. */
const CONFIRM_TARGET_FLAG = "--yes-i-know-the-target";

/** How many objects pass between two progress lines. */
const PROGRESS_INTERVAL = 500;

const REQUIRED_ENV_NAMES = [
  "SOURCE_SUPABASE_URL",
  "SOURCE_SECRET_KEY",
  "TARGET_SUPABASE_URL",
  "TARGET_SECRET_KEY",
] as const;

/** The listing columns the copy reads from the target. */
const LISTING_COLUMNS =
  "id, access_kind, metadata, parquet_cache_status, parquet_cache_folder_path, parquet_cache_part_count";

type StorageErrorLike = {
  message: string;
  statusCode?: string | undefined;
  code?: string | undefined;
};

type CatalogStorageBucket = {
  list: (
    path: string,
    options: Readonly<{ limit: number; offset?: number }>,
  ) => PromiseLike<{
    data: ReadonlyArray<{ name: string; id: string | null }> | null;
    error: { message: string } | null;
  }>;
  download: (path: string) => PromiseLike<{
    data: { arrayBuffer: () => Promise<ArrayBuffer> } | null;
    error: { message: string } | null;
  }>;
  upload: (
    path: string,
    body: ArrayBuffer,
    options: Readonly<{
      contentType: string;
      cacheControl: string;
      upsert: boolean;
    }>,
  ) => PromiseLike<{ error: StorageErrorLike | null }>;
};

/** One target listing, with the columns that say where its Parquet lives. */
export type CatalogParquetListing = {
  id: string;
  access_kind: string;
  metadata: unknown;
  parquet_cache_status: string | null;
  parquet_cache_folder_path: string | null;
  parquet_cache_part_count: number | null;
};

/**
 * The part of a Supabase project the copy uses: its `opendata` bucket, a
 * paged read of `data_catalog_listings`, and an exact count of its rows.
 * `_createCatalogClient` builds one from a real client, and tests pass fakes
 * that refuse every other call.
 */
export type CatalogParquetClient = {
  storage: { from: (bucket: string) => CatalogStorageBucket };
  listListings: (range: Readonly<{ from: number; to: number }>) => PromiseLike<{
    data: readonly CatalogParquetListing[] | null;
    error: { message: string } | null;
  }>;
  countListings: () => PromiseLike<{
    count: number | null;
    error: { message: string } | null;
  }>;
};

/**
 * What happened to the listings and objects one copy run looked at:
 * `targetListings` is the target's listing count, and `listings` how many
 * the copy read and processed.
 */
export type CatalogParquetCopyCounts = {
  targetListings: number;
  listings: number;
  copied: number;
  alreadyPresent: number;
  replaced: number;
  failed: number;
};

/** Both projects' URLs, keys, and hosts, read by `getCopySetupFromEnv`. */
export type CopyCatalogParquetSetup = {
  sourceUrl: string;
  sourceKey: string;
  sourceHost: string;
  targetUrl: string;
  targetKey: string;
  targetHost: string;
};

type ObjectOutcome = "copied" | "alreadyPresent" | "replaced";

type CopyContext = Readonly<{
  sourceBucket: CatalogStorageBucket;
  targetBucket: CatalogStorageBucket;
  record: (outcome: ObjectOutcome | "failed", note?: string) => void;
}>;

/**
 * Gets the catalog listing id from a path in the `opendata` bucket, such as
 * `catalog-cache/<listing>/<build>/part-00000.parquet`. Undefined for a
 * path outside `catalog-cache/`.
 *
 * Use it to tell which listing a cached Parquet object belongs to, for
 * example to check that a listing's cache folder is its own.
 */
export function getListingIdFromCachePath(path: string): string | undefined {
  const [folder, listingId] = path.split("/");
  if (folder !== CATALOG_CACHE_FOLDER || !listingId) {
    return undefined;
  }
  return listingId;
}

/**
 * Gets the host that follows `--yes-i-know-the-target` in the script's
 * arguments, or undefined when the flag is absent or has no value. The
 * copy runs unprompted only when this host matches the target's.
 */
export function getTargetHostFromArgs(
  args: readonly string[],
): string | undefined {
  const host = args[args.indexOf(CONFIRM_TARGET_FLAG) + 1];
  if (!args.includes(CONFIRM_TARGET_FLAG) || host === undefined) {
    return undefined;
  }
  return host.startsWith("--") ? undefined : host;
}

/**
 * Gets why the script's arguments must be refused, or undefined when they
 * are empty or exactly `--yes-i-know-the-target <host>`. Anything else is
 * refused, `--dry-run` included, so no flag the copy does not know can make
 * a reader believe it ran without writing.
 */
export function getCopyArgsRefusal(
  args: readonly string[],
): string | undefined {
  const isConfirmation =
    args.length === 2 && getTargetHostFromArgs(args) !== undefined;
  if (args.length === 0 || isConfirmation) {
    return undefined;
  }
  return `Unknown arguments: ${args.join(" ")}. The only option is ${CONFIRM_TARGET_FLAG} <target-host>, and there is no dry run.`;
}

/** The URL's host, with its port when the URL names one. */
function _getHostFromUrl(url: string): string | undefined {
  try {
    return new URL(url).host;
  } catch {
    return undefined;
  }
}

/**
 * Gets the copy's setup from the environment, or why the copy must not
 * run: a missing variable, a URL that is not one, or a source and target
 * that are the same project. Keys come only from the environment, so they
 * never land in shell history, and the setup never prints them.
 */
export function getCopySetupFromEnv(
  env: Readonly<Record<string, string | undefined>>,
):
  | { isRefused: true; reason: string }
  | { isRefused: false; setup: CopyCatalogParquetSetup } {
  const missingNames = REQUIRED_ENV_NAMES.filter((name) => {
    return !env[name];
  });
  if (missingNames.length > 0) {
    return { isRefused: true, reason: `Set ${missingNames.join(", ")}.` };
  }
  const sourceUrl = env.SOURCE_SUPABASE_URL ?? "";
  const targetUrl = env.TARGET_SUPABASE_URL ?? "";
  const sourceHost = _getHostFromUrl(sourceUrl);
  const targetHost = _getHostFromUrl(targetUrl);
  if (sourceHost === undefined || targetHost === undefined) {
    const name = sourceHost === undefined ? "SOURCE" : "TARGET";
    return { isRefused: true, reason: `${name}_SUPABASE_URL is not a URL.` };
  }
  if (sourceHost === targetHost) {
    return {
      isRefused: true,
      reason: `The source and target are the same project (${targetHost}).`,
    };
  }
  return {
    isRefused: false,
    setup: {
      sourceUrl,
      sourceKey: env.SOURCE_SECRET_KEY ?? "",
      sourceHost,
      targetUrl,
      targetKey: env.TARGET_SECRET_KEY ?? "",
      targetHost,
    },
  };
}

/**
 * Yields the path of every object under a folder, depth first. Folders come
 * back from `list` with a null `id`, and each folder is paged by `offset`
 * until a page comes back empty, so at most one page per folder level is held
 * at a time.
 */
async function* _listObjectPaths(
  bucket: CatalogStorageBucket,
  folderPath: string,
): AsyncGenerator<string> {
  for (let offset = 0; ;) {
    const { data, error } = await bucket.list(folderPath, {
      limit: STORAGE_PAGE_SIZE,
      offset,
    });
    if (error !== null) {
      throw new Error(`Could not list ${folderPath}: ${error.message}`);
    }
    const entries = data ?? [];
    if (entries.length === 0) {
      return;
    }
    offset += entries.length;
    for (const entry of entries) {
      const path = `${folderPath}/${entry.name}`;
      if (entry.id === null) {
        yield* _listObjectPaths(bucket, path);
      } else {
        yield path;
      }
    }
  }
}

/**
 * Yields every listing in the target, ordered by id, a page at a time until
 * a page comes back empty.
 */
async function* _listTargetListings(
  target: CatalogParquetClient,
): AsyncGenerator<CatalogParquetListing> {
  for (let from = 0; ;) {
    const { data, error } = await target.listListings({
      from,
      to: from + LISTING_PAGE_SIZE - 1,
    });
    if (error !== null) {
      throw new Error(`Could not read the target's listings: ${error.message}`);
    }
    const listings = data ?? [];
    if (listings.length === 0) {
      return;
    }
    from += listings.length;
    yield* listings;
  }
}

async function _countTargetListings(
  target: CatalogParquetClient,
): Promise<number> {
  const { count, error } = await target.countListings();
  if (error !== null || count === null) {
    throw new Error(
      `Could not count the target's listings: ${error?.message ?? "no count"}`,
    );
  }
  return count;
}

/**
 * Whether an upload failed only because the object is already there. The
 * Storage API answers an upload with `upsert: false` to an existing path
 * with a `409` status code, the `ResourceAlreadyExists` code on newer
 * servers, and the message "The resource already exists".
 */
function _isAlreadyExistsError(error: StorageErrorLike): boolean {
  return (
    error.statusCode === "409" ||
    error.code === "ResourceAlreadyExists" ||
    /already exists/i.test(error.message)
  );
}

function _getSha256Hex(bytes: ArrayBuffer): string {
  return createHash("sha256").update(new Uint8Array(bytes)).digest("hex");
}

async function _download(
  bucket: CatalogStorageBucket,
  path: string,
): Promise<ArrayBuffer> {
  const { data, error } = await bucket.download(path);
  if (error !== null || data === null) {
    throw new Error(`download failed: ${error?.message ?? "no body"}`);
  }
  // Buffer one object at a time, as an ArrayBuffer so the upload sends the
  // Parquet content type rather than the downloaded Blob's.
  return await data.arrayBuffer();
}

/** Uploads one object, reporting an existing object instead of failing. */
async function _upload(options: {
  bucket: CatalogStorageBucket;
  path: string;
  body: ArrayBuffer;
  cacheControl: string;
  upsert: boolean;
}): Promise<"uploaded" | "exists"> {
  const { error } = await options.bucket.upload(options.path, options.body, {
    contentType: PARQUET_CONTENT_TYPE,
    cacheControl: options.cacheControl,
    upsert: options.upsert,
  });
  if (error === null) {
    return "uploaded";
  }
  if (!options.upsert && _isAlreadyExistsError(error)) {
    return "exists";
  }
  throw new Error(`upload failed: ${error.message}`);
}

/**
 * Copies a listing's prebuilt copy, only the build folder its
 * `parquet_cache_folder_path` names, and checks that a `ready` copy ends with
 * `parquet_cache_part_count` parts in the target.
 */
async function _copyCacheFolder(
  context: CopyContext,
  listing: CatalogParquetListing,
): Promise<void> {
  const folder = listing.parquet_cache_folder_path ?? "";
  if (getListingIdFromCachePath(folder) !== listing.id) {
    context.record("failed", `${folder} is not listing ${listing.id}'s folder`);
    return;
  }
  for await (const path of _listObjectPaths(context.sourceBucket, folder)) {
    try {
      const outcome = await _upload({
        bucket: context.targetBucket,
        path,
        body: await _download(context.sourceBucket, path),
        cacheControl: CACHE_PART_CACHE_CONTROL_SECONDS,
        upsert: false,
      });
      context.record(outcome === "uploaded" ? "copied" : "alreadyPresent");
    } catch (error) {
      context.record("failed", `${path}: ${String(error)}`);
    }
  }
  if (listing.parquet_cache_status !== "ready") {
    return;
  }
  let targetPartCount = 0;
  for await (const _path of _listObjectPaths(context.targetBucket, folder)) {
    targetPartCount += 1;
  }
  if (targetPartCount !== listing.parquet_cache_part_count) {
    context.record(
      "failed",
      `${folder} has ${targetPartCount} parts in the target, not ${listing.parquet_cache_part_count}`,
    );
  }
}

function _isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Gets where a `pipeline_parquet` listing's object lives and its expected
 * SHA-256, from the `metadata` the pipeline wrote, or why it cannot be
 * copied.
 */
function _getPipelineObject(
  listing: CatalogParquetListing,
): { path: string; sha256: string | undefined } | { problem: string } {
  const metadata = _isRecord(listing.metadata) ? listing.metadata : {};
  const path = metadata.storage_object_path;
  const sha256 = metadata.parquet_sha256;
  if (metadata.open_data_bucket !== OPEN_DATA_BUCKET) {
    return { problem: `its bucket is not ${OPEN_DATA_BUCKET}` };
  }
  if (
    typeof path !== "string" ||
    !path.endsWith(".parquet") ||
    path.startsWith("/") ||
    path.startsWith(`${CATALOG_CACHE_FOLDER}/`) ||
    path.split("/").includes("..")
  ) {
    return { problem: `its storage_object_path is not a Parquet object path` };
  }
  return { path, sha256: typeof sha256 === "string" ? sha256 : undefined };
}

/**
 * Copies a `pipeline_parquet` listing's object. When the target already has
 * one, it is replaced only when its bytes do not match the listing's
 * `parquet_sha256`, the one case the copy overwrites.
 */
async function _copyPipelineObject(
  context: CopyContext,
  listing: CatalogParquetListing,
): Promise<void> {
  const object = _getPipelineObject(listing);
  if ("problem" in object) {
    context.record("failed", `listing ${listing.id}: ${object.problem}`);
    return;
  }
  const { path, sha256 } = object;
  const body = await _download(context.sourceBucket, path);
  if (sha256 !== undefined && _getSha256Hex(body) !== sha256) {
    throw new Error("the source object does not match parquet_sha256");
  }
  const upload = { bucket: context.targetBucket, path, body };
  const cacheControl = PIPELINE_OBJECT_CACHE_CONTROL_SECONDS;
  if (
    (await _upload({ ...upload, cacheControl, upsert: false })) === "uploaded"
  ) {
    context.record("copied");
    return;
  }
  if (
    sha256 === undefined ||
    _getSha256Hex(await _download(context.targetBucket, path)) === sha256
  ) {
    context.record("alreadyPresent");
    return;
  }
  await _upload({ ...upload, cacheControl, upsert: true });
  context.record("replaced");
}

async function _assertTargetHasBucket(
  targetBucket: CatalogStorageBucket,
): Promise<void> {
  const { error } = await targetBucket.list("", { limit: 1 });
  if (error !== null) {
    throw new Error(
      `The target has no readable \`${OPEN_DATA_BUCKET}\` bucket (${error.message}). Apply the migrations that create it first.`,
    );
  }
}

function _createRecorder(
  counts: CatalogParquetCopyCounts,
  log: (line: string) => void,
): CopyContext["record"] {
  return (outcome, note) => {
    counts[outcome] += 1;
    if (outcome === "failed") {
      log(`Failed ${note ?? ""}`);
    }
    const objectCount =
      counts.copied + counts.alreadyPresent + counts.replaced + counts.failed;
    if (objectCount % PROGRESS_INTERVAL === 0) {
      log(`Looked at ${objectCount} objects.`);
    }
  };
}

/**
 * Copies the Parquet objects of every listing the target has, from one
 * Supabase project's `opendata` bucket to the same paths in another's: the
 * build folder each prebuilt copy's `parquet_cache_folder_path` names, and
 * each `pipeline_parquet` listing's `metadata.storage_object_path`. Moves
 * the catalog into staging and production after `importCatalogData.sh`
 * has loaded the listings, and throws when the target has none yet.
 *
 * Reads the source only. Uploads to the target with `upsert: false`, so an
 * object already there counts as done and the copy is safe to re-run, except
 * a `pipeline_parquet` object whose bytes do not match its listing's
 * `parquet_sha256`, which is replaced. A failed object is logged and
 * counted, and the copy moves on.
 *
 * Run as a script, with both projects' URLs and secret keys in
 * `SOURCE_SUPABASE_URL`, `SOURCE_SECRET_KEY`, `TARGET_SUPABASE_URL`, and
 * `TARGET_SECRET_KEY`:
 *
 *   node scripts/catalog-move/copyCatalogParquet/copyCatalogParquet.ts \
 *     [--yes-i-know-the-target <target-host>]
 *
 * It prints both hosts, asks for the target host unless the flag names it,
 * refuses any other argument, and exits as `getCopyExitCode` says. Node runs
 * this file directly, so keep every `$/` import type-only.
 */
export async function copyCatalogParquet(
  options: Readonly<{
    source: CatalogParquetClient;
    target: CatalogParquetClient;
    log?: (line: string) => void;
  }>,
): Promise<CatalogParquetCopyCounts> {
  const { source, target, log = () => {} } = options;
  const targetBucket = target.storage.from(OPEN_DATA_BUCKET);
  await _assertTargetHasBucket(targetBucket);
  const counts: CatalogParquetCopyCounts = {
    targetListings: await _countTargetListings(target),
    listings: 0,
    copied: 0,
    alreadyPresent: 0,
    replaced: 0,
    failed: 0,
  };
  const context: CopyContext = {
    sourceBucket: source.storage.from(OPEN_DATA_BUCKET),
    targetBucket,
    record: _createRecorder(counts, log),
  };
  for await (const listing of _listTargetListings(target)) {
    counts.listings += 1;
    if (listing.parquet_cache_folder_path !== null) {
      await _copyCacheFolder(context, listing);
    }
    if (listing.access_kind === "pipeline_parquet") {
      await _copyPipelineObject(context, listing).catch((error: unknown) => {
        context.record("failed", `listing ${listing.id}: ${String(error)}`);
      });
    }
  }
  if (counts.listings === 0) {
    throw new Error(
      "The target has no catalog listings. Run importCatalogData.sh first.",
    );
  }
  return counts;
}

/**
 * Gets the copy script's exit code from a run's counts: 1 when any object
 * failed, or when the copy processed a different number of listings than the
 * target holds, as when a capped page went unnoticed; 0 otherwise.
 */
export function getCopyExitCode(counts: CatalogParquetCopyCounts): 0 | 1 {
  return counts.failed > 0 || counts.listings !== counts.targetListings ? 1 : 0;
}

async function _isTargetConfirmed(
  targetHost: string,
  args: readonly string[],
): Promise<boolean> {
  if (args.includes(CONFIRM_TARGET_FLAG)) {
    return getTargetHostFromArgs(args) === targetHost;
  }
  if (!process.stdin.isTTY) {
    return false;
  }
  const prompt = createInterface({
    input: process.stdin,
    output: process.stderr,
  });
  try {
    const typedHost = await prompt.question(
      `Type the target host (${targetHost}) to copy into it: `,
    );
    return typedHost.trim() === targetHost;
  } finally {
    prompt.close();
  }
}

/**
 * Creates the Supabase project handle the copy uses. The listing read is
 * written out here, because checking the whole typed client against
 * `CatalogParquetClient` is too deep for the compiler.
 */
function _createCatalogClient(url: string, key: string): CatalogParquetClient {
  const client = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return {
    storage: client.storage,
    listListings: (range) => {
      return client
        .from("data_catalog_listings")
        .select(LISTING_COLUMNS)
        .order("id")
        .range(range.from, range.to);
    },
    countListings: () => {
      return client
        .from("data_catalog_listings")
        .select("id", { count: "exact", head: true });
    },
  };
}

async function _main(): Promise<number> {
  const args = process.argv.slice(2);
  const argsRefusal = getCopyArgsRefusal(args);
  const result = getCopySetupFromEnv(process.env);
  if (argsRefusal !== undefined || result.isRefused) {
    console.error(
      `Refusing to copy: ${argsRefusal ?? (result.isRefused ? result.reason : "")}`,
    );
    return 1;
  }
  const { setup } = result;
  console.log(`Source: ${setup.sourceHost} (read only)`);
  console.log(
    `Target: ${setup.targetHost} (uploads; replaces only a pipeline object whose SHA-256 differs)`,
  );
  if (!(await _isTargetConfirmed(setup.targetHost, args))) {
    console.error(
      `Refusing to copy: the target was not confirmed as ${setup.targetHost}. Type it at the prompt or pass ${CONFIRM_TARGET_FLAG} ${setup.targetHost}.`,
    );
    return 1;
  }
  const counts = await copyCatalogParquet({
    source: _createCatalogClient(setup.sourceUrl, setup.sourceKey),
    target: _createCatalogClient(setup.targetUrl, setup.targetKey),
    log: (line) => {
      console.log(line);
    },
  });
  console.log(
    `Listings processed ${counts.listings} of the target's ${counts.targetListings}: copied ${counts.copied}, already in the target ${counts.alreadyPresent}, replaced ${counts.replaced}, failed ${counts.failed}.`,
  );
  if (counts.listings !== counts.targetListings) {
    console.error(
      "The copy processed a different number of listings than the target holds. Re-run it.",
    );
  }
  return getCopyExitCode(counts);
}

if (
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  _main().then(
    (exitCode) => {
      process.exitCode = exitCode;
    },
    (error: unknown) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    },
  );
}
