import { createSupabaseLocalEnvironmentIO } from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/createSupabaseLocalEnvironmentIO/createSupabaseLocalEnvironmentIO";
import { runSupabaseSwitch } from "@ava-cli/SupabaseCLI/SupabaseSwitchCli/runSupabaseSwitch/runSupabaseSwitch";
import {
  printError,
  printInfo,
  printSuccess,
  printWarn,
} from "@ava-cli/utils/cliOutput/cliOutput";
import { Acclimate } from "@avandar/acclimate";
import type {
  SupabaseSeedOutcome,
  SupabaseSwitchResult,
} from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/SupabaseLocalEnvironment.types";
import type { RunSupabaseSwitchOutcome } from "@ava-cli/SupabaseCLI/SupabaseSwitchCli/runSupabaseSwitch/runSupabaseSwitch";

/** How to seed by hand once a switch has already finished. */
const MANUAL_SEED_COMMAND = "pnpm db:seed";

const RESTORE_THEN_SWITCH_MESSAGE =
  "Run `ava supabase restore` first, then you can switch to a new id.";

function _printSeedOutcome(seed: Readonly<SupabaseSeedOutcome>): void {
  switch (seed.state) {
    case "seeded":
      printInfo("Seed data is loaded.");
      return;
    case "skipped":
      printInfo(`The database is unseeded. Run \`${MANUAL_SEED_COMMAND}\`.`);
      return;
    case "unchanged":
      return;
    case "failed":
      printWarn(
        `The project is running, but seeding failed: ${seed.message}\nRerun it with \`${MANUAL_SEED_COMMAND}\`.`,
      );
      return;
  }
}

function _printSwitchResult(result: Readonly<SupabaseSwitchResult>): void {
  printSuccess(
    `Supabase project ${result.projectId} is active on API port ${result.basePort}.`,
  );
  printInfo(
    `\`pnpm dev\` will serve this worktree on port ${result.devServerPort}.`,
  );
  _printSeedOutcome(result.seed);
}

function _printOutcome(outcome: Readonly<RunSupabaseSwitchOutcome>): void {
  if (outcome.kind === "declined") {
    printInfo(RESTORE_THEN_SWITCH_MESSAGE);
    process.exitCode = 1;
    return;
  }
  _printSwitchResult(outcome.result);
}

async function _confirmReuse(existingProjectId: string): Promise<boolean> {
  printInfo(`This branch already has a switch: ${existingProjectId}.`);
  if (process.stdin.isTTY !== true) {
    throw new Error(
      `Pass ${existingProjectId} to start it, or run \`ava supabase restore\` ` +
        "first, then you can switch to a new id.",
    );
  }
  const answer = await Acclimate.requestInput({
    message: "|bright_cyan|Switch to it? [y/N]|reset|",
    params: {},
    responseOptions: { required: false, type: "boolean", defaultValue: false },
  });
  return answer === "true";
}

/** CLI for starting a branch-isolated local Supabase project. */
export const SupabaseSwitchCli = Acclimate.createCLI("switch")
  .description(
    "Start an isolated local Supabase project for this Git branch. " +
      "Omit the id to derive one from the branch name.",
  )
  .addPositionalArg({
    name: "temporaryProjectId",
    required: false,
    description:
      "Temporary local Supabase project id. Defaults to a kebab-case " +
      "form of the current Git branch.",
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
        temporaryProjectId?: string;
        requestedBasePort?: number;
        noSeed?: boolean;
      }>,
    ) => {
      return runSupabaseSwitch({
        io: createSupabaseLocalEnvironmentIO(process.cwd()),
        requestedProjectId: commandArguments.temporaryProjectId,
        requestedBasePort: commandArguments.requestedBasePort,
        skipSeed: commandArguments.noSeed,
        confirmReuse: _confirmReuse,
      })
        .then(_printOutcome)
        .catch((error: unknown) => {
          printError(error instanceof Error ? error.message : String(error));
          process.exitCode = 1;
        });
    },
  );
