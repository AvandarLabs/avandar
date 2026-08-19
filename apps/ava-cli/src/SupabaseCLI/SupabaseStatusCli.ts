import path from "node:path";
import { createSupabaseLocalEnvironmentIO } from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/createSupabaseLocalEnvironmentIO/createSupabaseLocalEnvironmentIO";
import { SupabaseStatus } from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/SupabaseStatus/SupabaseStatus";
import { printError, printWarn } from "@ava-cli/utils/cliOutput/cliOutput";
import { Acclimate } from "@avandar/acclimate";
import type {
  SupabaseStatusEntry,
  SupabaseStatusReport,
} from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/SupabaseLocalEnvironment.types";

/** Describes the current stack, in the words that fit this branch. */
function _makeHeadlineDescription(
  options: Readonly<{ report: SupabaseStatusReport; color: string }>,
): string {
  const { report, color } = options;
  if (report.isSwitched) {
    return report.isExpectedForBranch ?
        `This worktree runs its own local Supabase: |${color}|$projectId$|reset| (branch $branch$).`
      : `Branch $branch$ is on an isolated local Supabase: |${color}|$projectId$|reset|, not the stack it shares with everyone else.`;
  }
  return report.isExpectedForBranch ?
      `This worktree uses the shared local Supabase: |${color}|$projectId$|reset|, which is where branch $branch$ belongs.`
    : `This worktree uses the |${color}|shared|reset| local Supabase: |${color}|$projectId$|reset| (branch $branch$).`;
}

/** The way out of an unhealthy state, or nothing when the state is healthy. */
function _makeHeadlineAdvice(
  report: Readonly<SupabaseStatusReport>,
): string | undefined {
  return (
    report.isExpectedForBranch ? undefined
    : report.isSwitched ?
      "   Run `ava supabase restore` to put $branch$ back on the shared stack."
    : "   Every unswitched worktree writes to this database. Run `ava supabase switch <project-id>` to isolate this branch."
  );
}

function _printHeadline(report: Readonly<SupabaseStatusReport>): void {
  const color = report.isExpectedForBranch ? "bright_green" : "bright_yellow";
  const badge = report.isExpectedForBranch ? "✅" : "⚠️ ";
  const label = report.isSwitched ? "SWITCHED" : "STANDARD";
  const params = { projectId: report.projectId, branch: report.branch };

  Acclimate.log(
    `|${color}|${badge} ${label} |reset|${_makeHeadlineDescription({ report, color })}`,
    params,
  );
  const advice = _makeHeadlineAdvice(report);
  if (advice !== undefined) {
    Acclimate.log(`|yellow|${advice}`, params);
  }
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
  Acclimate.log("");
  Acclimate.log(`|bright_cyan|${title}`);
  entries.forEach(({ label, value }) => {
    Acclimate.log(`|cyan|  ${label.padEnd(labelWidth)}  |reset|${value}`);
  });
}

function _printEnvironmentDrift(report: Readonly<SupabaseStatusReport>): void {
  if (report.environmentDrift.length === 0) {
    return;
  }
  Acclimate.log("");
  Acclimate.log("|bright_cyan|Environment files");
  report.environmentDrift.forEach(({ filePath, staleKeys }) => {
    const fileName = path.basename(filePath);
    Acclimate.log(
      staleKeys.length === 0 ?
        `|green|  ✅ ${fileName} matches the running stack`
      : `|bright_yellow|  ⚠️  ${fileName} is stale: ${staleKeys.join(", ")}`,
    );
  });
}

function _printReport(report: Readonly<SupabaseStatusReport>): void {
  _printHeadline(report);
  _printSection({ title: "Ports", entries: report.ports });
  if (!report.isRunning) {
    Acclimate.log("");
    printWarn(
      "Local Supabase is not running, so no live values are available. Start it with `supabase start`.",
    );
    return;
  }
  _printSection({
    title: "Values this codebase reads",
    entries: report.environmentValues,
  });
  _printSection({ title: "Endpoints", entries: report.endpoints });
  _printEnvironmentDrift(report);
}

/** CLI for reporting which local Supabase this worktree is pointed at. */
export const SupabaseStatusCli = Acclimate.createCLI("status")
  .description("Report the local Supabase project, ports, and keys in use")
  .action(() => {
    const io = createSupabaseLocalEnvironmentIO(process.cwd());
    return SupabaseStatus.readStatusReport(io)
      .then(_printReport)
      .catch((error: unknown) => {
        printError(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
      });
  });
