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
  E2E_REQUIRED_VITE_FEATURE_FLAGS.forEach((flag) => {
    process.env.VITE_FEATURE_FLAGS = appendViteFeatureFlag(
      process.env.VITE_FEATURE_FLAGS,
      flag,
    );
  });
  process.env.VITE_OFFLINE_CHAT_MOCK = "true";
}
