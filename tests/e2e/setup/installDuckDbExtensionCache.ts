import fs from "node:fs/promises";
import path from "node:path";
import type { BrowserContext } from "@playwright/test";

/** Every DuckDB extension request the browser makes. */
const EXTENSION_URL_PATTERN = "**/extensions.duckdb.org/**";

/**
 * Where fetched extensions are kept. Inside `node_modules/.cache` so it is
 * already ignored by git, already wiped by a clean install, and shared by
 * every worker of every run in this checkout.
 *
 * Decompressed / gzipped-on-the-wire, measured on DuckDB v1.4.4 `wasm_eh`:
 * spatial 22.4 / 6.0MB, parquet 2.9 / 0.7MB, json 0.8 / 0.2MB, excel 0.6 /
 * 0.2MB. Re-measure by listing this directory and piping each file to
 * `gzip -c`.
 */
const CACHE_DIR = path.resolve(
  process.cwd(),
  "node_modules/.cache/ava-duckdb-extensions",
);

/**
 * A cache filename for one extension URL.
 *
 * The DuckDB version is part of the URL (`/v1.4.4/wasm_eh/spatial…`), so it
 * is part of the key: bumping `@duckdb/duckdb-wasm` simply misses the cache
 * and refetches rather than serving a binary the new engine cannot load.
 */
function _getCacheFileName(url: string): string {
  const { pathname } = new URL(url);
  return pathname.replace(/^\/+/, "").replace(/[^a-zA-Z0-9._-]/g, "_");
}

/** The cached body, or `undefined` on a miss or an unreadable file. */
async function _readCached(fileName: string): Promise<Buffer | undefined> {
  try {
    return await fs.readFile(path.join(CACHE_DIR, fileName));
  } catch {
    return undefined;
  }
}

/** Writes through a temp file so concurrent workers cannot read a partial. */
async function _writeCached(
  options: Readonly<{ body: Buffer; fileName: string }>,
): Promise<void> {
  const target = path.join(CACHE_DIR, options.fileName);
  const temporary = `${target}.${process.pid}.tmp`;
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.writeFile(temporary, options.body);
    await fs.rename(temporary, target);
  } catch {
    await fs.rm(temporary, { force: true }).catch(() => {});
  }
}

/**
 * Serves DuckDB's WASM extensions from a local cache, filling it on first use.
 *
 * DuckDB-WASM cannot persist extensions across page loads and the CDN sends no
 * `cache-control`, so every Playwright context refetches whatever it loads:
 * `parquet` and `json` at startup, then `spatial` or `excel` when a screen asks
 * for one. For a GIS spec that is ~6.9MB over the wire, twice if it reloads,
 * with a third-party CDN in the suite's critical path.
 *
 * The first run to want a file fetches and stores it; every run after that is
 * local, which also makes a warmed suite work offline. This is possible at all
 * because the requests come from DuckDB's Web Worker and are still routable.
 */
export async function installDuckDbExtensionCache(
  context: BrowserContext,
): Promise<void> {
  await context.route(EXTENSION_URL_PATTERN, async (route) => {
    try {
      const url = route.request().url();
      const fileName = _getCacheFileName(url);
      const cached = await _readCached(fileName);
      if (cached) {
        await route.fulfill({
          status: 200,
          contentType: "application/wasm",
          body: cached,
        });
        return;
      }
      const response = await route.fetch();
      const body = await response.body();
      if (response.ok()) {
        await _writeCached({ body, fileName });
      }
      await route.fulfill({ response, body });
    } catch {
      // Every path has to end in a resolved route, so this catch covers the
      // whole handler rather than just the fetch: a cold cache with no route
      // to the CDN, a disposed response body, a context closing mid-fetch.
      // An unhandled route leaves the browser waiting instead of failing, so
      // DuckDB's `LOAD` never reaches the catch that reports the extension as
      // unavailable and the spec burns its timeout. Aborting surfaces as a
      // rejected fetch, which that catch does see.
      await route.abort("failed").catch(() => {});
    }
  });
}
