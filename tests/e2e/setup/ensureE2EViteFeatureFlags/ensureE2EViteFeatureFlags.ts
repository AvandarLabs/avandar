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

const E2E_REQUIRED_VITE_FEATURE_FLAGS = [
  "enable-shared-with-me",
  /** Avoid spatial.duckdb_extension.wasm (breaks offline Playwright). */
  "disable-duckdb-spatial",
] as const;

/**
 * Ensures feature flags required by Playwright specs are enabled for the test
 * runner and the Vite dev server.
 */
export function ensureE2EViteFeatureFlags(): void {
  const isSpatialEnabled = process.env.PLAYWRIGHT_ENABLE_DUCKDB_SPATIAL === "1";
  E2E_REQUIRED_VITE_FEATURE_FLAGS.filter((flag) => {
    return !(isSpatialEnabled && flag === "disable-duckdb-spatial");
  }).forEach((flag) => {
    process.env.VITE_FEATURE_FLAGS = appendViteFeatureFlag(
      process.env.VITE_FEATURE_FLAGS,
      flag,
    );
  });
  if (isSpatialEnabled) {
    process.env.VITE_FEATURE_FLAGS = removeViteFeatureFlag(
      process.env.VITE_FEATURE_FLAGS,
      "disable-duckdb-spatial",
    );
  }
  process.env.VITE_OFFLINE_CHAT_MOCK = "true";
}

/** Existing servers are unsafe when a run changes Spatial loading behavior. */
export function shouldReuseE2EViteServer(isCI: boolean): boolean {
  return !isCI && process.env.PLAYWRIGHT_ENABLE_DUCKDB_SPATIAL !== "1";
}
