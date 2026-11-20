import { createInterface } from "node:readline/promises";
import { pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "$/types/database.types";

/** The bucket that holds the open data catalog's prebuilt Parquet copies. */
const OPEN_DATA_BUCKET = "opendata";

/** The bucket folder every prebuilt copy lives under. */
const CATALOG_CACHE_FOLDER = "catalog-cache";

/** The most objects one Storage list call returns. */
const STORAGE_PAGE_SIZE = 1000;

/** The content type every pipeline uploads Parquet with. */
const PARQUET_CONTENT_TYPE = "application/vnd.apache.parquet";

/** One year, in seconds: a copy's part never changes once uploaded. */
const PARQUET_CACHE_CONTROL_SECONDS = "31536000";

/** Listing ids are UUIDs, so any other folder name is not a listing. */
const LISTING_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

/**
 * The part of a Supabase client the copy uses: the `opendata` bucket and
 * an id lookup on `data_catalog_listings`. A real `createClient` result
 * satisfies it, and tests pass fakes that refuse every other call.
 */
export type CatalogParquetClient = {
  storage: { from: (bucket: string) => CatalogStorageBucket };
  from: (table: "data_catalog_listings") => {
    select: (columns: "id") => {
      eq: (
        column: "id",
        value: string,
      ) => PromiseLike<{
        data: ReadonlyArray<{ id: string }> | null;
        error: { message: string } | null;
      }>;
    };
  };
};

/** What happened to the objects one copy run looked at. */
export type CatalogParquetCopyCounts = {
  copied: number;
  alreadyPresent: number;
  skipped: number;
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

type CopyOutcome = keyof CatalogParquetCopyCounts;

/**
 * Gets the catalog listing id from a path in the `opendata` bucket, such as
 * `catalog-cache/<listing>/<build>/part-00000.parquet`. Undefined for a
 * path outside `catalog-cache/`.
 *
 * Use it to tell which listing a cached Parquet object belongs to, for
 * example to skip objects of listings a project does not have.
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
 * back from `list` with a null `id`, and each folder is paged by `offset`,
 * so at most one page per folder level is held at a time.
 */
async function* _listObjectPaths(
  bucket: CatalogStorageBucket,
  folderPath: string,
): AsyncGenerator<string> {
  for (let offset = 0; ; offset += STORAGE_PAGE_SIZE) {
    const { data, error } = await bucket.list(folderPath, {
      limit: STORAGE_PAGE_SIZE,
      offset,
    });
    if (error !== null) {
      throw new Error(`Could not list ${folderPath}: ${error.message}`);
    }
    const entries = data ?? [];
    for (const entry of entries) {
      const path = `${folderPath}/${entry.name}`;
      if (entry.id === null) {
        yield* _listObjectPaths(bucket, path);
      } else {
        yield path;
      }
    }
    if (entries.length < STORAGE_PAGE_SIZE) {
      return;
    }
  }
}

/** Remembers, per listing id, whether the target has that listing. */
function _createListingLookup(
  target: CatalogParquetClient,
): (listingId: string) => Promise<boolean> {
  const knownListings = new Map<string, boolean>();
  return async (listingId) => {
    if (!LISTING_ID_PATTERN.test(listingId)) {
      return false;
    }
    const knownValue = knownListings.get(listingId);
    if (knownValue !== undefined) {
      return knownValue;
    }
    const { data, error } = await target
      .from("data_catalog_listings")
      .select("id")
      .eq("id", listingId);
    if (error !== null) {
      throw new Error(`Could not read the target's listings: ${error.message}`);
    }
    const isInTarget = (data ?? []).length > 0;
    knownListings.set(listingId, isInTarget);
    return isInTarget;
  };
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

async function _copyObject(
  options: Readonly<{
    sourceBucket: CatalogStorageBucket;
    targetBucket: CatalogStorageBucket;
    path: string;
  }>,
): Promise<"copied" | "alreadyPresent"> {
  const { sourceBucket, targetBucket, path } = options;
  const { data, error } = await sourceBucket.download(path);
  if (error !== null || data === null) {
    throw new Error(`download failed: ${error?.message ?? "no body"}`);
  }
  // Buffer one object at a time, as an ArrayBuffer so the upload sends the
  // Parquet content type rather than the downloaded Blob's.
  const { error: uploadError } = await targetBucket.upload(
    path,
    await data.arrayBuffer(),
    {
      contentType: PARQUET_CONTENT_TYPE,
      cacheControl: PARQUET_CACHE_CONTROL_SECONDS,
      upsert: false,
    },
  );
  if (uploadError === null) {
    return "copied";
  }
  if (_isAlreadyExistsError(uploadError)) {
    return "alreadyPresent";
  }
  throw new Error(`upload failed: ${uploadError.message}`);
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

/**
 * Copies the open data catalog's prebuilt Parquet objects from one Supabase
 * project's `opendata` bucket to the same paths in another's, for listings
 * the target already has. Moves the catalog into `alpha-dev` and production
 * after `importCatalogData.sh` has loaded the listings.
 *
 * Reads the source only, and only uploads to the target with `upsert:
 * false`, so an object already in the target counts as done and the copy is
 * safe to re-run after a failure. A failed object is logged and counted, and
 * the copy moves on.
 *
 * Run as a script, with both projects' URLs and secret keys in
 * `SOURCE_SUPABASE_URL`, `SOURCE_SECRET_KEY`, `TARGET_SUPABASE_URL`, and
 * `TARGET_SECRET_KEY`:
 *
 *   node scripts/alpha/copyCatalogParquet/copyCatalogParquet.ts \
 *     [--yes-i-know-the-target <target-host>]
 *
 * It prints both hosts, asks for the target host unless the flag names it,
 * and exits 1 when any object failed. Node runs this file directly, so keep
 * every `$/` import type-only.
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
  const sourceBucket = source.storage.from(OPEN_DATA_BUCKET);
  const isListingInTarget = _createListingLookup(target);
  const counts: CatalogParquetCopyCounts = {
    copied: 0,
    alreadyPresent: 0,
    skipped: 0,
    failed: 0,
  };
  for await (const path of _listObjectPaths(
    sourceBucket,
    CATALOG_CACHE_FOLDER,
  )) {
    const listingId = getListingIdFromCachePath(path) ?? "";
    const outcome: CopyOutcome = (await isListingInTarget(listingId))
      ? await _copyObject({ sourceBucket, targetBucket, path }).catch(
          (error: unknown) => {
            log(
              `Failed ${path}: ${error instanceof Error ? error.message : String(error)}`,
            );
            return "failed" as const;
          },
        )
      : "skipped";
    counts[outcome] += 1;
    const seenCount = Object.values(counts).reduce((sum, count) => {
      return sum + count;
    }, 0);
    if (seenCount % PROGRESS_INTERVAL === 0) {
      log(`Looked at ${seenCount} objects.`);
    }
  }
  return counts;
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
 * Creates the Supabase client the copy uses. The table query is forwarded
 * call by call, because checking the whole typed client against
 * `CatalogParquetClient` is too deep for the compiler.
 */
function _createCatalogClient(url: string, key: string): CatalogParquetClient {
  const client = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return {
    storage: client.storage,
    from: (table) => {
      return {
        select: (columns) => {
          return {
            eq: (column, value) => {
              return client.from(table).select(columns).eq(column, value);
            },
          };
        },
      };
    },
  };
}

async function _main(): Promise<number> {
  const result = getCopySetupFromEnv(process.env);
  if (result.isRefused) {
    console.error(`Refusing to copy: ${result.reason}`);
    return 1;
  }
  const { setup } = result;
  console.log(`Source: ${setup.sourceHost} (read only)`);
  console.log(`Target: ${setup.targetHost} (uploads only, never overwrites)`);
  if (!(await _isTargetConfirmed(setup.targetHost, process.argv.slice(2)))) {
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
    `Copied ${counts.copied}, already in the target ${counts.alreadyPresent}, skipped ${counts.skipped}, failed ${counts.failed}.`,
  );
  return counts.failed > 0 ? 1 : 0;
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
