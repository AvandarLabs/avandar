import { createSupabaseLocalEnvironmentIO } from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/createSupabaseLocalEnvironmentIO/createSupabaseLocalEnvironmentIO";
import { SupabaseLocalEnvironment } from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/SupabaseLocalEnvironment";
import {
  printError,
  printInfo,
  printSuccess,
  printWarn,
} from "@ava-cli/utils/cliOutput/cliOutput";
import { Acclimate } from "@avandar/acclimate";
import type { SupabaseSeedOutcome } from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/SupabaseLocalEnvironment.types";

/** How to seed by hand once a switch has already finished. */
const MANUAL_SEED_COMMAND = "pnpm db:seed";

function _printSeedOutcome(seed: Readonly<SupabaseSeedOutcome>): void {
  switch (seed.state) {
    case "seeded":
      printInfo("Seed data is loaded.");
      return;
    case "skipped":
      printInfo(`The database is unseeded. Run \`${MANUAL_SEED_COMMAND}\`.`);
      return;
    case "failed":
      printWarn(
        `The project is running, but seeding failed: ${seed.message}\nRerun it with \`${MANUAL_SEED_COMMAND}\`.`,
      );
      return;
  }
}

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
  .addOption({
    name: "--no-seed",
    description:
      "Leave the new project empty instead of running the database seed.",
    required: false,
    default: false,
    type: "boolean",
  })
  .action(
    (
      commandArguments: Readonly<{
        temporaryProjectId: string;
        requestedBasePort?: number;
        // Acclimate leaves an unsupplied boolean option out of the parsed
        // arguments rather than filling in its declared default.
        noSeed?: boolean;
      }>,
    ) => {
      const io = createSupabaseLocalEnvironmentIO(process.cwd());
      return SupabaseLocalEnvironment.switch({
        io,
        temporaryProjectId: commandArguments.temporaryProjectId,
        requestedBasePort: commandArguments.requestedBasePort,
        skipSeed: commandArguments.noSeed,
      })
        .then(({ basePort, devServerPort, projectId, seed }) => {
          printSuccess(
            `Supabase project ${projectId} is active on API port ${basePort}.`,
          );
          printInfo(
            `\`pnpm dev\` will serve this worktree on port ${devServerPort}.`,
          );
          _printSeedOutcome(seed);
        })
        .catch((error: unknown) => {
          printError(error instanceof Error ? error.message : String(error));
          process.exitCode = 1;
        });
    },
  );
