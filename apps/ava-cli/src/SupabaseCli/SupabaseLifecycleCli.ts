import { SupabaseBranchTarget } from "@ava-cli/SupabaseCli/SupabaseBranchTarget";
import { SupabaseSwitchState } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseSwitchState";
import { SupabaseTargetHeadline } from "@ava-cli/SupabaseCli/SupabaseTargetHeadline/SupabaseTargetHeadline";
import { CliTheme } from "@ava-cli/utils/CliTheme/CliTheme";
import { Acclimate } from "@avandar/acclimate";
import type { CommandHelpSpec } from "@ava-cli/utils/CommandHelp/CommandHelp";
import type { AnyCLI } from "@avandar/acclimate";

/** A Supabase CLI subcommand `ava` wraps with a branch-aware headline. */
type SupabaseLifecycleCommand = "start" | "stop";

const COPY_FROM_COMMAND = {
  start: {
    summary:
      "Start the local Supabase a branch uses: the shared develop stack, or the branch's own switched project.",
    progress: "Starting",
    done: "is running",
  },
  stop: {
    summary:
      "Stop the local Supabase a branch uses: the shared develop stack, or the branch's own switched project. Data is kept.",
    progress: "Stopping",
    done: "is stopped",
  },
} as const satisfies Record<
  SupabaseLifecycleCommand,
  { summary: string; progress: string; done: string }
>;

/** The help screen of one wrapped command, read from its own CLI. */
function _makeHelpSpec(
  options: Readonly<{ command: SupabaseLifecycleCommand; cli: AnyCLI }>,
): CommandHelpSpec {
  const { command } = options;
  return {
    commandPath: ["supabase", command],
    cli: options.cli,
    usage: [`ava supabase ${command} [--branch <name>]`],
    labels: { "--branch": "<name>" },
    examples: [
      {
        label: `ava supabase ${command}`,
        description: `Run \`supabase ${command}\` for the current branch.`,
      },
      {
        label: `ava supabase ${command} --branch feat/nux`,
        description: `Run \`supabase ${command}\` in the worktree of feat/nux.`,
      },
    ],
  };
}

async function _run(
  options: Readonly<{ command: SupabaseLifecycleCommand; branch?: string }>,
): Promise<void> {
  const commandName = `ava supabase ${options.command}`;
  const target = await SupabaseBranchTarget.read(options.branch);
  if (target.kind === "failed") {
    CliTheme.error({ command: commandName, ...target });
    process.exitCode = 1;
    return;
  }
  const { io } = target;
  const summary = await SupabaseSwitchState.read(io);
  SupabaseTargetHeadline.print({ summary });
  if (summary.switchKind === "remote") {
    CliTheme.error({
      command: commandName,
      message: `Branch ${summary.branch} uses the hosted project ${summary.projectId}, so there is no local Supabase to ${options.command}.`,
      hint: "Run `ava supabase restore` in that worktree to go back to a local Supabase.",
    });
    process.exitCode = 1;
    return;
  }
  if (summary.switchKind === "shared" && options.command === "stop") {
    CliTheme.warning(
      "Every worktree that is not switched uses this stack, so their database stops too.",
    );
  }
  const copy = COPY_FROM_COMMAND[options.command];
  CliTheme.progress(
    `${copy.progress} local Supabase ${summary.projectId} in ${io.projectRoot}...`,
  );
  const result = await io.runSupabase([options.command], {
    outputMode: "stream",
  });
  if (!result.ok) {
    CliTheme.error({
      command: commandName,
      message: `supabase ${options.command} failed: ${result.stderr || "unknown error"}`,
      hint: "Read the Supabase output above, check that Docker is running, and retry.",
    });
    process.exitCode = 1;
    return;
  }
  CliTheme.success(`Local Supabase ${summary.projectId} ${copy.done}.`);
}

/** The Acclimate command that runs one wrapped Supabase command. */
function _createCli(command: SupabaseLifecycleCommand) {
  return Acclimate.createCLI(command)
    .description(COPY_FROM_COMMAND[command].summary)
    .addOption({
      name: "--branch",
      aliases: ["-b"],
      description:
        "Act on the Supabase of this local branch's worktree instead of the current one. The branch must exist locally and be checked out in a worktree.",
      required: false,
      type: "string",
    })
    .action((commandArguments: Readonly<{ branch?: string }>) => {
      return _run({ command, branch: commandArguments.branch }).catch(
        (error: unknown) => {
          CliTheme.error({
            command: `ava supabase ${command}`,
            message: error instanceof Error ? error.message : String(error),
            hint: "Check that Docker and Git are available, then retry.",
          });
          process.exitCode = 1;
        },
      );
    });
}

const START_CLI = _createCli("start");
const STOP_CLI = _createCli("stop");

/**
 * `ava supabase start` and `ava supabase stop`: the Supabase CLI commands,
 * run in the right worktree and opened with a line naming which database
 * they touch.
 */
export const SupabaseLifecycleCli = {
  /** The `ava supabase start` command. */
  startCli: START_CLI,

  /** The `ava supabase stop` command. */
  stopCli: STOP_CLI,

  /** What `ava supabase start --help` prints. */
  startHelp: _makeHelpSpec({ command: "start", cli: START_CLI }),

  /** What `ava supabase stop --help` prints. */
  stopHelp: _makeHelpSpec({ command: "stop", cli: STOP_CLI }),
};
