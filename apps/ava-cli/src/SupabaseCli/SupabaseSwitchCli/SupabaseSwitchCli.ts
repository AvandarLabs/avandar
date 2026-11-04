import { createSupabaseLocalEnvironmentIo } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/createSupabaseLocalEnvironmentIo/createSupabaseLocalEnvironmentIo";
import { runSupabaseSwitch } from "@ava-cli/SupabaseCli/SupabaseSwitchCli/runSupabaseSwitch/runSupabaseSwitch";
import { SupabaseSwitchRemoteCli } from "@ava-cli/SupabaseCli/SupabaseSwitchCli/SupabaseSwitchRemoteCli/SupabaseSwitchRemoteCli";
import { CliTheme } from "@ava-cli/utils/CliTheme/CliTheme";
import { findRepoRoot } from "@ava-cli/utils/findRepoRoot";
import { TerminalMenu } from "@ava-cli/utils/TerminalMenu/TerminalMenu";
import { Acclimate } from "@avandar/acclimate";
import type {
  SupabaseSeedOutcome,
  SupabaseSwitchResult,
} from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseLocalEnvironment.types";
import type { RunSupabaseSwitchOutcome } from "@ava-cli/SupabaseCli/SupabaseSwitchCli/runSupabaseSwitch/runSupabaseSwitch";
import type { CommandHelpSpec } from "@ava-cli/utils/CommandHelp/CommandHelp";

const COMMAND_NAME = "ava supabase switch";

/** How to seed by hand once a switch has already finished. */
const MANUAL_SEED_COMMAND = "pnpm db:seed";

const RESTORE_THEN_SWITCH_MESSAGE =
  "Run `ava supabase restore` first, then you can switch to a new id.";

/** What `ava supabase switch --help` prints. */
export const SupabaseSwitchHelp: CommandHelpSpec = {
  commandPath: ["supabase", "switch"],
  summary:
    "Start a local Supabase project of this branch's own, so its database is isolated from every other worktree. `ava supabase switch remote` points the worktree at a hosted project instead.",
  usage: [
    "ava supabase switch [project-id] [base-port] [--no-seed]",
    "ava supabase switch remote [options]",
  ],
  arguments: [
    {
      label: "[project-id]",
      description:
        "Local project id. Defaults to the branch name in kebab case, e.g. feat/nux becomes feat-nux.",
    },
    {
      label: "[base-port]",
      description:
        "API port to start the project's port set at. Defaults to the first free set from 55321.",
    },
  ],
  options: [
    {
      label: "--no-seed",
      description: "Leave the new project empty instead of seeding it.",
    },
  ],
  examples: [
    {
      label: "ava supabase switch",
      description: "Give the current branch its own seeded local Supabase.",
    },
    {
      label: "ava supabase switch feat-nux-empty 56321 --no-seed",
      description: "Use a chosen id and port set, and skip the seed.",
    },
    {
      label: "ava supabase switch remote --help",
      description: "See how to point the worktree at a hosted project.",
    },
  ],
};

function _printSeedOutcome(seed: Readonly<SupabaseSeedOutcome>): void {
  switch (seed.state) {
    case "seeded":
      CliTheme.info("Seed data is loaded.");
      return;
    case "skipped":
      CliTheme.info(
        `The database is unseeded. Run \`${MANUAL_SEED_COMMAND}\`.`,
      );
      return;
    case "unchanged":
      return;
    case "failed":
      CliTheme.warning(
        `The project is running, but seeding failed: ${seed.message}\nRerun it with \`${MANUAL_SEED_COMMAND}\`.`,
      );
      return;
  }
}

function _printSwitchResult(result: Readonly<SupabaseSwitchResult>): void {
  CliTheme.success(
    `Supabase project ${result.projectId} is active on API port ${result.basePort}.`,
  );
  CliTheme.info(
    `\`pnpm dev\` will serve this worktree on port ${result.devServerPort}.`,
  );
  _printSeedOutcome(result.seed);
}

function _printOutcome(outcome: Readonly<RunSupabaseSwitchOutcome>): void {
  if (outcome.kind === "declined") {
    CliTheme.info(RESTORE_THEN_SWITCH_MESSAGE);
    process.exitCode = 1;
    return;
  }
  _printSwitchResult(outcome.result);
}

async function _confirmReuse(existingProjectId: string): Promise<boolean> {
  CliTheme.info(`This branch already has a switch: ${existingProjectId}.`);
  if (!TerminalMenu.isAvailable()) {
    throw new Error(
      `Pass ${existingProjectId} to start it, or run \`ava supabase restore\` ` +
        "first, then you can switch to a new id.",
    );
  }
  return await TerminalMenu.confirm({
    question: `Start ${existingProjectId} instead?`,
    isYesDefault: false,
  });
}

/** CLI for starting a branch-isolated local Supabase project. */
export const SupabaseSwitchCli = Acclimate.createCLI("switch")
  .description(SupabaseSwitchHelp.summary)
  .addCommand("remote", SupabaseSwitchRemoteCli)
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
      CliTheme.progress(
        "Switching this branch to a local Supabase of its own...",
      );
      return runSupabaseSwitch({
        io: createSupabaseLocalEnvironmentIo(findRepoRoot() ?? process.cwd()),
        requestedProjectId: commandArguments.temporaryProjectId,
        requestedBasePort: commandArguments.requestedBasePort,
        skipSeed: commandArguments.noSeed,
        confirmReuse: _confirmReuse,
      })
        .then(_printOutcome)
        .catch((error: unknown) => {
          CliTheme.error({
            command: COMMAND_NAME,
            message: error instanceof Error ? error.message : String(error),
            hint: "Fix what the message names and retry. A failed switch puts the env files back.",
          });
          process.exitCode = 1;
        });
    },
  );
