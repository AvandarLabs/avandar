import process from "node:process";
import { isBunDesktopRuntime } from "$/env/isBunDesktopRuntime.ts";
import { isDenoRuntime } from "$/env/isDenoRuntime.ts";
import { isNodeRuntime } from "$/env/isNodeRuntime.ts";
import { isViteBrowserRuntime } from "$/env/isViteBrowserRuntime.ts";

/**
 * Returns the Supabase public (anon) API key from the environment variables.
 * This function can be called from many different environments: the
 * Vite-bundled browser (web app or Electrobun renderer), the Electrobun
 * desktop's Bun main process, Node, and Deno (edge functions).
 *
 * The Bun-desktop branch is checked before Node because Bun also exposes
 * `process.env`.
 *
 * @returns The Supabase public (anon) API key.
 * @throws Error When `VITE_SUPABASE_ANON_KEY` is not set in the current
 * environment.
 */
export function getSupabasePublicAPIKey(): string {
  if (isDenoRuntime()) {
    return Deno.env.get("VITE_SUPABASE_ANON_KEY") ?? _missing();
  }

  if (isBunDesktopRuntime()) {
    return process.env.VITE_SUPABASE_ANON_KEY ?? _missing();
  }

  if (isViteBrowserRuntime()) {
    return import.meta.env?.VITE_SUPABASE_ANON_KEY ?? _missing();
  }

  if (isNodeRuntime()) {
    return process.env.VITE_SUPABASE_ANON_KEY ?? _missing();
  }

  return _missing();
}

function _missing(): never {
  throw new Error(
    "VITE_SUPABASE_ANON_KEY is not set in the environment variables",
  );
}
