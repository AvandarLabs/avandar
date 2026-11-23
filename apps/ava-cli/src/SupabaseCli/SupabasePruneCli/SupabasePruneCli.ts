import { DockerInventory } from "@ava-cli/SupabaseCli/SupabasePruneCli/DockerInventory/DockerInventory";
import { PruneCandidateText } from "@ava-cli/SupabaseCli/SupabasePruneCli/PruneCandidateText/PruneCandidateText";
import { PruneDeletion } from "@ava-cli/SupabaseCli/SupabasePruneCli/PruneDeletion";
import { PrunePlanReader } from "@ava-cli/SupabaseCli/SupabasePruneCli/PrunePlanReader";
import { PruneSelection } from "@ava-cli/SupabaseCli/SupabasePruneCli/PruneSelection/PruneSelection";
import { CliTheme } from "@ava-cli/utils/CliTheme/CliTheme";
import { findRepoRoot } from "@ava-cli/utils/findRepoRoot";
import { Acclimate } from "@avandar/acclimate";
import type { SupabasePruneFlags } from "@ava-cli/SupabaseCli/SupabasePruneCli/PruneSelection/PruneSelection";
import type { PruneCandidate } from "@ava-cli/SupabaseCli/SupabasePruneCli/SupabasePrunePlan/SupabasePrunePlan";
import type { CommandHelpSpec } from "@ava-cli/utils/CommandHelp/CommandHelp";

const COMMAND_NAME = "ava supabase prune";

function _printCandidates(candidates: readonly PruneCandidate[]): void {
  CliTheme.writeLine({
    stream: process.stdout,
    style: "heading",
    text: `Prune candidates (${candidates.length})`,
  });
  candidates.forEach((candidate) => {
    CliTheme.writeLine({
      stream: process.stdout,
      text: `  ${PruneCandidateText.fromCandidate(candidate)}`,
    });
  });
}

function _reportPruneOutcome(
  options: Readonly<{ failedIds: readonly string[]; numPruned: number }>,
): void {
  if (options.failedIds.length > 0) {
    CliTheme.error({
      command: COMMAND_NAME,
      message: `${options.failedIds.join(", ")} still has Docker resources left.`,
      hint: "Read the warnings above, then rerun `ava supabase prune` to retry.",
    });
    process.exitCode = 1;
    return;
  }
  CliTheme.success(
    `Pruned ${PruneCandidateText.fromCount({ numItems: options.numPruned, noun: "local Supabase project" })}.`,
  );
}

async function _pruneSelected(
  options: Readonly<{
    repoRoot: string;
    candidates: readonly PruneCandidate[];
    flags: SupabasePruneFlags;
  }>,
): Promise<void> {
  const { repoRoot, flags } = options;
  const selection = await PruneSelection.select(options);
  if (selection.kind === "failed") {
    _printCandidates(options.candidates);
    CliTheme.error({ command: COMMAND_NAME, ...selection });
    process.exitCode = 1;
    return;
  }
  if (selection.kind === "cancelled") {
    CliTheme.info("Cancelled, so nothing was deleted.");
    return;
  }
  if (selection.candidates.length === 0) {
    CliTheme.info("Nothing was selected, so nothing was deleted.");
    return;
  }
  const shouldDeleteImages = await PruneSelection.shouldDeleteImages(flags);
  const failedIds = await PruneDeletion.deleteProjects({
    repoRoot,
    candidates: selection.candidates,
  });
  if (shouldDeleteImages) {
    await PruneDeletion.deleteUnusedImages({
      repoRoot,
      candidates: selection.candidates,
    });
  }
  _reportPruneOutcome({
    failedIds,
    numPruned: selection.candidates.length,
  });
}

async function _run(flags: Readonly<SupabasePruneFlags>): Promise<void> {
  const repoRoot = findRepoRoot() ?? process.cwd();
  CliTheme.progress(
    "Looking for local Supabase projects whose branch is gone...",
  );
  const { runtime, isReachable } = await DockerInventory.readRuntime(repoRoot);
  if (!isReachable) {
    CliTheme.error({
      command: COMMAND_NAME,
      message: `${runtime.label} is not running, so Docker cannot list projects.`,
      hint: runtime.startHint,
    });
    process.exitCode = 1;
    return;
  }
  CliTheme.info(`Docker runtime: ${runtime.label}`);
  const plan = await PrunePlanReader.read(repoRoot);
  if (plan.ignoredProjectIds.length > 0) {
    CliTheme.info(
      `Left alone, not from this repository: ${plan.ignoredProjectIds.join(", ")}`,
    );
  }
  if (plan.candidates.length === 0) {
    CliTheme.success(
      `Nothing to prune. ${plan.kept.length} branch projects are still in use.`,
    );
    return;
  }
  if (flags.dryRun === true) {
    _printCandidates(plan.candidates);
    return;
  }
  await _pruneSelected({ repoRoot, candidates: plan.candidates, flags });
}

/** CLI for deleting local Supabase projects whose branch is gone. */
export const SupabasePruneCli = Acclimate.createCLI("prune")
  .description(
    "Delete the local Supabase projects whose branch or worktree no longer exists: their containers, networks, and database volumes. The shared develop project and every project a current branch uses are never offered.",
  )
  .addOption({
    name: "--all",
    description: "Delete every verified prune candidate without asking.",
    required: false,
    type: "boolean",
  })
  .addOption({
    name: "--keep",
    description:
      "Delete every verified candidate except these project ids, without asking.",
    required: false,
    type: "string",
  })
  .addOption({
    name: "--include-unverified",
    description:
      "With --all or --keep, also delete candidates known only by their name. Their containers are gone, so nothing proves they came from this repository.",
    required: false,
    type: "boolean",
  })
  .addOption({
    name: "--images",
    description:
      "Also delete the Supabase images the pruned projects used, unless another container still needs them. The next `supabase start` downloads them again.",
    required: false,
    type: "boolean",
  })
  .addOption({
    name: "--dry-run",
    description: "Only list the candidates. Nothing is deleted.",
    required: false,
    type: "boolean",
  })
  .action((commandArguments: Readonly<SupabasePruneFlags>) => {
    return _run(commandArguments).catch((error: unknown) => {
      CliTheme.error({
        command: COMMAND_NAME,
        message: error instanceof Error ? error.message : String(error),
        hint: "Check that Docker is running, then retry.",
      });
      process.exitCode = 1;
    });
  });

/** What `ava supabase prune --help` prints. */
export const SupabasePruneHelp: CommandHelpSpec = {
  commandPath: ["supabase", "prune"],
  cli: SupabasePruneCli,
  usage: [
    "ava supabase prune [--all | --keep <id...>] [--include-unverified] [--images] [--dry-run]",
  ],
  labels: { "--keep": "<id...>" },
  examples: [
    {
      label: "ava supabase prune",
      description:
        "Pick candidates in a list; unselect the ones to keep. Name-only candidates start unselected.",
    },
    {
      label: "ava supabase prune --keep feat-nux-old --images",
      description: "Delete all but one candidate, and their unused images.",
    },
    {
      label: "ava supabase prune --dry-run",
      description: "See what would be deleted.",
    },
  ],
};
