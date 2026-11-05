import path from "node:path";
import { SupabaseBranchTarget } from "@ava-cli/SupabaseCli/SupabaseBranchTarget";
import { SHARED_STACK_BRANCH } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseLocalEnvironment.constants";
import { SupabaseStatus } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseStatus/SupabaseStatus";
import { SupabaseTargetHeadline } from "@ava-cli/SupabaseCli/SupabaseTargetHeadline/SupabaseTargetHeadline";
import { CliTheme } from "@ava-cli/utils/CliTheme/CliTheme";
import { Acclimate } from "@avandar/acclimate";
import type {
  SupabaseStatusEntry,
  SupabaseStatusReport,
} from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseLocalEnvironment.types";
import type { CliStyle } from "@ava-cli/utils/CliTheme/CliTheme";
import type { CommandHelpSpec } from "@ava-cli/utils/CommandHelp/CommandHelp";

const COMMAND_NAME = "ava supabase status";

function _print(options: Readonly<{ style?: CliStyle; text: string }>): void {
  CliTheme.writeLine({ stream: process.stdout, ...options });
}

/** The way out of a state that is wrong for the branch, if it is wrong. */
function _makeAdvice(
  report: Readonly<SupabaseStatusReport>,
): string | undefined {
  const restoreAdvice = `   ${SHARED_STACK_BRANCH} belongs on the shared stack. Run \`ava supabase restore\` to put it back.`;
  const switchAdvice =
    "   Every worktree that is not switched writes to this database. Run `ava supabase switch` to give this branch its own.";
  return report.isExpectedForBranch
    ? undefined
    : report.branch === SHARED_STACK_BRANCH
      ? restoreAdvice
      : switchAdvice;
}

function _printSection(
  options: Readonly<{ title: string; entries: readonly SupabaseStatusEntry[] }>,
): void {
  const { title, entries } = options;
  if (entries.length === 0) {
    return;
  }
  const labelWidth = Math.max(
    ...entries.map(({ label }) => {
      return label.length;
    }),
  );
  _print({ text: "" });
  _print({ style: "heading", text: title });
  entries.forEach(({ label, value }) => {
    const paddedLabel = CliTheme.paintFor({
      stream: process.stdout,
      style: "accent",
      text: `  ${label.padEnd(labelWidth)}`,
    });
    _print({ text: `${paddedLabel}  ${value}` });
  });
}

function _printEnvironmentDrift(report: Readonly<SupabaseStatusReport>): void {
  if (report.environmentDrift.length === 0) {
    return;
  }
  _print({ text: "" });
  _print({ style: "heading", text: "Environment files" });
  report.environmentDrift.forEach(({ filePath, staleKeys }) => {
    const fileName = path.basename(filePath);
    _print(
      staleKeys.length === 0
        ? {
            style: "success",
            text: `  ✅ ${fileName} matches the running stack`,
          }
        : {
            style: "warning",
            text: `  ⚠️  ${fileName} is stale: ${staleKeys.join(", ")}`,
          },
    );
  });
}

function _printRemoteReport(report: Readonly<SupabaseStatusReport>): void {
  _printSection({
    title: "Remote project",
    entries: [
      { label: "Project id", value: report.projectId },
      { label: "API URL", value: report.remoteApiUrl ?? "unknown" },
    ],
  });
  _printSection({
    title: "Values this codebase reads",
    entries: report.environmentValues,
  });
}

function _printReport(report: Readonly<SupabaseStatusReport>): void {
  SupabaseTargetHeadline.print({ summary: report, stream: process.stdout });
  const advice = _makeAdvice(report);
  if (advice !== undefined) {
    _print({ style: "warning", text: advice });
  }
  if (report.switchKind === "remote") {
    _printRemoteReport(report);
    return;
  }
  _printSection({ title: "Ports", entries: report.ports });
  if (!report.isRunning) {
    _print({ text: "" });
    _print({
      style: "warning",
      text: "⚠️  Local Supabase is not running, so no live values are available. Start it with `ava supabase start`.",
    });
    return;
  }
  _printSection({
    title: "Values this codebase reads",
    entries: report.environmentValues,
  });
  _printSection({ title: "Endpoints", entries: report.endpoints });
  _printEnvironmentDrift(report);
}

async function _run(branch: string | undefined): Promise<void> {
  const target = await SupabaseBranchTarget.read(branch);
  if (target.kind === "failed") {
    CliTheme.error({ command: COMMAND_NAME, ...target });
    process.exitCode = 1;
    return;
  }
  CliTheme.progress("Reading the Supabase project, ports, and keys...");
  _printReport(await SupabaseStatus.readStatusReport(target.io));
}

/** CLI for reporting which Supabase a worktree is pointed at. */
export const SupabaseStatusCli = Acclimate.createCLI("status")
  .description(
    "Report which Supabase a branch uses (the shared develop stack, its own switched project, or a remote one) and its ports, keys, and endpoints.",
  )
  .addOption({
    name: "--branch",
    aliases: ["-b"],
    description:
      "Report on this local branch's worktree instead of the current one. The branch must exist locally and be checked out in a worktree.",
    required: false,
    type: "string",
  })
  .action((commandArguments: Readonly<{ branch?: string }>) => {
    return _run(commandArguments.branch).catch((error: unknown) => {
      CliTheme.error({
        command: COMMAND_NAME,
        message: error instanceof Error ? error.message : String(error),
        hint: "Check that this is a worktree of the Avandar repository, then retry.",
      });
      process.exitCode = 1;
    });
  });

/** What `ava supabase status --help` prints. */
export const SupabaseStatusHelp: CommandHelpSpec = {
  commandPath: ["supabase", "status"],
  cli: SupabaseStatusCli,
  usage: ["ava supabase status [--branch <name>]"],
  labels: { "--branch": "<name>" },
  examples: [
    {
      label: "ava supabase status",
      description: "Report on the current branch.",
    },
    {
      label: "ava supabase status --branch feat/nux",
      description: "Report on the worktree that has feat/nux checked out.",
    },
  ],
};
