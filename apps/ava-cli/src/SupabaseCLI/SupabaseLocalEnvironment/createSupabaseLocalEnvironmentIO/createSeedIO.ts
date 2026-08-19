import { RunLocalCommand } from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/createSupabaseLocalEnvironmentIO/RunLocalCommand";
import type { SupabaseLocalEnvironmentIO } from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/SupabaseLocalEnvironment.types";

/** The seed entry point `pnpm db:seed` runs once the stack is already up. */
const SEED_SCRIPT_ARGUMENTS = [
  "vite-script",
  "scripts/seedDatabaseScript.ts",
] as const;

/**
 * Creates the adapter that seeds a freshly switched local stack.
 *
 * The connection is passed as an explicit environment override rather than
 * left to `pnpm db:seed`. That script reaches the database through
 * `dotenv -e .env.development`, and dotenv keeps an already-set variable, so
 * the `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` that `ava` loaded from the
 * pre-switch environment file would win and the seed would land in whichever
 * stack the worktree used before. `supabase start` is skipped for the same
 * reason it is unnecessary: the caller has just started the project.
 */
export function createSeedIO(
  projectRoot: string,
): Pick<SupabaseLocalEnvironmentIO, "runSeed"> {
  return {
    runSeed: async ({ supabaseUrl, serviceRoleKey }) => {
      return await RunLocalCommand.run({
        command: "pnpm",
        args: SEED_SCRIPT_ARGUMENTS,
        cwd: projectRoot,
        env: {
          SUPABASE_URL: supabaseUrl,
          SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
        },
      });
    },
  };
}
