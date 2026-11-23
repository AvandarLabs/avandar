/**
 * Resolves the Supabase project URL from Playwright / E2E env vars.
 *
 * Prefers `VITE_SUPABASE_API_URL` (`.env.development`) then `SUPABASE_URL`.
 */
export function getSupabaseUrlFromEnv(): string {
  const url = process.env.VITE_SUPABASE_API_URL ?? process.env.SUPABASE_URL;

  if (!url) {
    throw new Error("VITE_SUPABASE_API_URL or SUPABASE_URL is required.");
  }

  return url;
}

/**
 * Same as {@link getSupabaseUrlFromEnv} but returns undefined when unset.
 */
export function tryGetSupabaseUrlFromEnv(): string | undefined {
  return process.env.VITE_SUPABASE_API_URL ?? process.env.SUPABASE_URL;
}

/**
 * Returns the configured Supabase anon key, or throws when it is missing.
 * Use it, for example, to configure a browser-style E2E client.
 */
export function getSupabaseAnonKeyFromEnv(): string {
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!anonKey) {
    throw new Error("VITE_SUPABASE_ANON_KEY is required.");
  }

  return anonKey;
}

/**
 * Returns the configured Supabase service role key, or throws when it is
 * missing.
 * Use it, for example, to create an administrative client for test setup.
 */
export function getSupabaseServiceRoleKeyFromEnv(): string {
  const serviceRoleKey = tryGetSupabaseServiceRoleKeyFromEnv();

  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is required (use the project's secret key).",
    );
  }

  return serviceRoleKey;
}

/**
 * Same as {@link getSupabaseServiceRoleKeyFromEnv} but returns undefined
 * when unset.
 */
export function tryGetSupabaseServiceRoleKeyFromEnv(): string | undefined {
  return process.env.SUPABASE_SERVICE_ROLE_KEY;
}
