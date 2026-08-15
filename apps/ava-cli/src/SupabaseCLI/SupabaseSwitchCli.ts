import { createSupabaseLocalEnvironmentIO } from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/createSupabaseLocalEnvironmentIO/createSupabaseLocalEnvironmentIO";
import { SupabaseLocalEnvironment } from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/SupabaseLocalEnvironment";
import { printError, printSuccess } from "@ava-cli/utils/cliOutput/cliOutput";
import { Acclimate } from "@avandar/acclimate";

/** CLI for starting a branch-isolated local Supabase project. */
export const SupabaseSwitchCli = Acclimate.createCLI("switch")
  .description("Start an isolated local Supabase project for this Git branch")
  .addPositionalArg({
    name: "temporaryProjectId",
    required: true,
    description: "Temporary local Supabase project id.",
    type: "string",
    validator: (value: string) => {
      return (
        /^[a-z0-9][a-z0-9_-]*$/.test(value) ||
        "Project id must start with a lower-case letter or number and use only lower-case letters, numbers, hyphens, and underscores."
      );
    },
  })
  .addPositionalArg({
    name: "requestedBasePort",
    required: false,
    description: "Optional API base port. Omit to select a free port set.",
    type: "number",
    parser: (value: string) => {
      return Number(value);
    },
    validator: (value: number) => {
      return (
        (Number.isInteger(value) && value >= 1 && value <= 65_535) ||
        "Port must be an integer from 1 through 65535."
      );
    },
  })
  .action(
    (
      commandArguments: Readonly<{
        temporaryProjectId: string;
        requestedBasePort?: number;
      }>,
    ) => {
      const io = createSupabaseLocalEnvironmentIO(process.cwd());
      return SupabaseLocalEnvironment.switch({
        io,
        temporaryProjectId: commandArguments.temporaryProjectId,
        requestedBasePort: commandArguments.requestedBasePort,
      })
        .then(({ basePort, projectId }) => {
          printSuccess(
            `Supabase project ${projectId} is active on API port ${basePort}.`,
          );
        })
        .catch((error: unknown) => {
          printError(error instanceof Error ? error.message : String(error));
          process.exitCode = 1;
        });
    },
  );
