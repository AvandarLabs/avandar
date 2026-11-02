import { createSupabaseLocalEnvironmentIo } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/createSupabaseLocalEnvironmentIo/createSupabaseLocalEnvironmentIo";
import { SupabaseLocalEnvironment } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseLocalEnvironment";
import { printError, printSuccess } from "@ava-cli/utils/cliOutput/cliOutput";
import { Acclimate } from "@avandar/acclimate";

/** CLI for restoring this branch's original local Supabase configuration. */
export const SupabaseRestoreCli = Acclimate.createCLI("restore")
  .description("Stop this branch's isolated Supabase project and restore files")
  .action(() => {
    const io = createSupabaseLocalEnvironmentIo(process.cwd());
    return SupabaseLocalEnvironment.restore(io)
      .then(() => {
        printSuccess("Supabase configuration restored for the current branch.");
      })
      .catch((error: unknown) => {
        printError(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
      });
  });
