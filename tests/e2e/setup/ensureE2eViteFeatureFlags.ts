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
  if (!tokens.includes(flag)) {
    tokens.push(flag);
  }
  return tokens.join(",");
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
export function ensureE2eViteFeatureFlags(): void {
  for (const flag of E2E_REQUIRED_VITE_FEATURE_FLAGS) {
    process.env.VITE_FEATURE_FLAGS = appendViteFeatureFlag(
      process.env.VITE_FEATURE_FLAGS,
      flag,
    );
  }
  process.env.VITE_OFFLINE_CHAT_MOCK = "true";
}
