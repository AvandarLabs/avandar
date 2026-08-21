import fs from "node:fs/promises";
import path from "node:path";
import type { BrowserContext } from "@playwright/test";

/** Every DuckDB extension request the browser makes. */
const EXTENSION_URL_PATTERN = "**/extensions.duckdb.org/**";

/**
 * Where fetched extensions are kept. Inside `node_modules/.cache` so it is
 * already ignored by git, already wiped by a clean install, and shared by
 * every worker of every run in this checkout.
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
 * DuckDB-WASM fetches `parquet`, `json`, `excel` and (for GIS) `spatial` from
 * `extensions.duckdb.org` on **every** fresh init, because it cannot persist
 * them across page loads, and the CDN sends no `cache-control`, so the browser
 * cannot help either. Each Playwright test gets a fresh context, so without a
 * cache every test refetches ~4.5MB and pays ~1.6s for it, twice for a spec
 * that reloads. That puts a third-party CDN in the critical path of the whole
 * suite, which is both slow and a source of timeouts nothing in the repo can
 * fix.
 *
 * The first run to want a given file fetches it and writes it to disk; every
 * run after that is local, which also makes the suite work offline once
 * warmed. Requests come from DuckDB's Web Worker and are still routable,
 * which is what makes this possible at all.
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
