import path from "node:path";
import { DEVELOPMENT_ENV_FILE } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseLocalEnvironment.constants";

/**
 * Where a worktree keeps the two files that decide its Supabase project, so
 * every switch, restore, status, and prune step names them the same way.
 */
export const SupabaseProjectPaths = {
  /** The worktree's `supabase/config.toml`, holding the shared defaults. */
  getConfigPathFromProjectRoot: (projectRoot: string): string => {
    return path.join(projectRoot, "supabase", "config.toml");
  },

  /** The worktree's `.env.development`, holding any project overrides. */
  getDevelopmentEnvPathFromProjectRoot: (projectRoot: string): string => {
    return path.join(projectRoot, DEVELOPMENT_ENV_FILE);
  },
};
