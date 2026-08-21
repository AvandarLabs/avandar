/**
 * Appends a Vite feature flag to `VITE_FEATURE_FLAGS` when it is not
 * already present. E2E tests rely on flags that CI sets in
 * `.env.development` but local gitignored env files may omit.
 */
export function appendViteFeatureFlag(
  existing: string | undefined,
  flag: string,
): string {
  const tokens = (existing ?? "")
    .split(",")
    .map((value) => {
      return value.trim();
    })
    .filter(Boolean);
  const tokensWithFlag = tokens.includes(flag) ? tokens : [...tokens, flag];
  return tokensWithFlag.join(",");
}

/** Removes one Vite feature flag without disturbing the remaining order. */
function removeViteFeatureFlag(
  existing: string | undefined,
  flag: string,
): string {
  return (existing ?? "")
    .split(",")
    .map((value) => {
      return value.trim();
    })
    .filter((value) => {
      return value !== "" && value !== flag;
    })
    .join(",");
}

/** Flags every E2E run needs, regardless of connectivity. */
const E2E_REQUIRED_VITE_FEATURE_FLAGS = ["enable-shared-with-me"] as const;

/** The tag carried by specs that cannot pass without network access. */
export const E2E_ONLINE_TAG = "@online";

/**
 * True when the run was asked to work without network access.
 *
 * Off by default, so a bare `pnpm test:e2e` behaves like the product does:
 * DuckDB fetches its Spatial extension and the GIS specs run. Opting out is
 * explicit (`pnpm test:e2e:offline`) because the failure mode of guessing
 * wrong is silent: with Spatial disabled the geometry controls render but stay
 * disabled, so the specs that need them time out on a dead control instead of
 * saying why.
 */
export function isE2EOfflineMode(): boolean {
  return process.env.PLAYWRIGHT_E2E_OFFLINE === "1";
}

/**
 * Ensures feature flags required by Playwright specs are enabled for the test
 * runner and the Vite dev server.
 *
 * Offline runs additionally disable DuckDB Spatial, which is fetched from
 * `extensions.duckdb.org` and therefore cannot load without a network. The
 * specs that need it are tagged `@online` and skipped by the config in that
 * mode rather than left to time out.
 */
export function ensureE2EViteFeatureFlags(): void {
  E2E_REQUIRED_VITE_FEATURE_FLAGS.forEach((flag) => {
    process.env.VITE_FEATURE_FLAGS = appendViteFeatureFlag(
      process.env.VITE_FEATURE_FLAGS,
      flag,
    );
  });
  process.env.VITE_FEATURE_FLAGS =
    isE2EOfflineMode() ?
      appendViteFeatureFlag(
        process.env.VITE_FEATURE_FLAGS,
        "disable-duckdb-spatial",
      )
    : removeViteFeatureFlag(
        process.env.VITE_FEATURE_FLAGS,
        "disable-duckdb-spatial",
      );
  process.env.VITE_OFFLINE_CHAT_MOCK = "true";
}
