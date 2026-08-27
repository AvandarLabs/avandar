/** Flags every E2E run needs, regardless of connectivity. */
const E2E_REQUIRED_VITE_FEATURE_FLAGS = ["enable-shared-with-me"] as const;

/**
 * Marks a spec that cannot pass once `disable-duckdb-spatial` is set, which
 * turns off `spatial` and `excel`. It does not mean "needs the CDN": `parquet`
 * is fetched too, and every dataset spec needs that.
 *
 * Decide by running `pnpm test:e2e:offline <spec>`, not by reading the query
 * gate, which under-reports. `gis-map-layers` builds a lat/lng layer that
 * emits no `ST_` call and still fails offline, because the geometry binding
 * controls need the capability before any query runs.
 */
export const E2E_ONLINE_TAG = "@online";

/** Appends a Vite feature flag to a comma-separated list, if absent. */
function _appendViteFeatureFlag(
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
function _removeViteFeatureFlag(
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

/**
 * True when the run was told to work without network access. Opt in through
 * `pnpm test:e2e:offline`, so a bare run behaves like the product does.
 */
export function isE2EOfflineMode(): boolean {
  return process.env.PLAYWRIGHT_E2E_OFFLINE === "1";
}

/**
 * Enables the feature flags Playwright specs need, for both the test runner
 * and the Vite dev server, and sets `VITE_OFFLINE_CHAT_MOCK`.
 *
 * CI has these flags in `.env.development`, but a local gitignored env file
 * may omit them, so the run sets them instead of trusting the environment. An
 * offline run also sets `disable-duckdb-spatial`, which stops DuckDB fetching
 * `spatial` and `excel` from `extensions.duckdb.org`. Specs needing either are
 * tagged {@link E2E_ONLINE_TAG} and skipped by the config rather than left to
 * time out.
 */
export function ensureE2EViteFeatureFlags(): void {
  E2E_REQUIRED_VITE_FEATURE_FLAGS.forEach((flag) => {
    process.env.VITE_FEATURE_FLAGS = _appendViteFeatureFlag(
      process.env.VITE_FEATURE_FLAGS,
      flag,
    );
  });
  process.env.VITE_FEATURE_FLAGS = isE2EOfflineMode()
    ? _appendViteFeatureFlag(
        process.env.VITE_FEATURE_FLAGS,
        "disable-duckdb-spatial",
      )
    : _removeViteFeatureFlag(
        process.env.VITE_FEATURE_FLAGS,
        "disable-duckdb-spatial",
      );
  process.env.VITE_OFFLINE_CHAT_MOCK = "true";
}
