import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { BranchWorktrees } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/BranchWorktrees/BranchWorktrees";
import { createSupabaseLocalEnvironmentIo } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/createSupabaseLocalEnvironmentIo/createSupabaseLocalEnvironmentIo";
import { SupabaseConfig } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseConfig/SupabaseConfig";
import { SupabaseConfigOverrides } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseConfigOverrides/SupabaseConfigOverrides";
import { SupabaseDockerCleanup } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseDockerCleanup";
import { DockerInventory } from "@ava-cli/SupabaseCli/SupabasePrune/DockerInventory/DockerInventory";
import { SupabasePrunePlan } from "@ava-cli/SupabaseCli/SupabasePrune/SupabasePrunePlan/SupabasePrunePlan";
import { CliTheme } from "@ava-cli/utils/CliTheme/CliTheme";
import { findRepoRoot } from "@ava-cli/utils/findRepoRoot";
import { TerminalMenu } from "@ava-cli/utils/TerminalMenu/TerminalMenu";
import { Acclimate } from "@avandar/acclimate";
import { promiseMap, promiseMapSequential } from "@avandar/utils";
import type {
  DockerSupabaseProject,
  PruneReason,
  SupabasePrunePlanResult,
  WorktreeProjectId,
} from "@ava-cli/SupabaseCli/SupabasePrune/SupabasePrunePlan/SupabasePrunePlan";
import type { CommandHelpSpec } from "@ava-cli/utils/CommandHelp/CommandHelp";

const COMMAND_NAME = "ava supabase prune";

type PruneOptions = {
  all?: boolean;
  keep?: string;
  dryRun?: boolean;
  images?: boolean;
};

type PruneCandidate = SupabasePrunePlanResult["candidates"][number];

/** What `ava supabase prune --help` prints. */
export const SupabasePruneHelp: CommandHelpSpec = {
  commandPath: ["supabase", "prune"],
  summary:
    "Delete the local Supabase projects whose branch or worktree no longer exists: their containers, networks, and database volumes. The shared develop project and every project a current branch uses are never offered.",
  usage: ["ava supabase prune [--all | --keep <id...>] [--images] [--dry-run]"],
  options: [
    {
      label: "--all",
      description: "Delete every prune candidate without asking.",
    },
    {
      label: "--keep <id...>",
      description:
        "Delete every candidate except these project ids, without asking.",
    },
    {
      label: "--images",
      description:
        "Also delete the Supabase images the pruned projects used, unless another container still needs them. The next `supabase start` downloads them again.",
    },
    {
      label: "--dry-run",
      description: "Only list the candidates. Nothing is deleted.",
    },
  ],
  examples: [
    {
      label: "ava supabase prune",
      description:
        "Pick candidates in a list where all start selected; unselect the ones to keep.",
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

function _getTildePath(filePath: string): string {
  const homeDirectory = os.homedir();
  return filePath.startsWith(`${homeDirectory}${path.sep}`)
    ? `~${filePath.slice(homeDirectory.length)}`
    : filePath;
}

function _getReasonText(reason: Readonly<PruneReason>): string {
  return reason.kind === "worktreeRemoved"
    ? `worktree ${_getTildePath(reason.worktreePath)} no longer exists`
    : "no local branch matches it";
}

function _countText(
  options: Readonly<{ count: number; noun: string }>,
): string {
  return `${options.count} ${options.noun}${options.count === 1 ? "" : "s"}`;
}

function _getResourceText(project: Readonly<DockerSupabaseProject>): string {
  const running = project.isRunning ? ", running" : "";
  return [
    _countText({ count: project.containerCount, noun: "container" }),
    _countText({ count: project.volumeCount, noun: "volume" }),
    `${_countText({ count: project.networkCount, noun: "network" })}${running}`,
  ].join(", ");
}

function _makeCandidateLabel(candidate: Readonly<PruneCandidate>): string {
  return `${candidate.project.projectId}  (${_getReasonText(candidate.reason)}; ${_getResourceText(candidate.project)})`;
}

/** The project id each worktree's Supabase CLI resolves to right now. */
async function _readWorktreeProjectIds(
  worktreePaths: readonly string[],
): Promise<WorktreeProjectId[]> {
  const projectIds = await promiseMap(worktreePaths, async (worktreePath) => {
    try {
      const configContents = await readFile(
        path.join(worktreePath, "supabase", "config.toml"),
        "utf8",
      );
      const envContents = await readFile(
        path.join(worktreePath, ".env.development"),
        "utf8",
      ).catch(() => {
        return "";
      });
      const { projectId } = SupabaseConfigOverrides.makeEffectiveState({
        config: SupabaseConfig.makeStateFromContents(configContents),
        envContents,
      });
      return [{ worktreePath, projectId }];
    } catch {
      // A worktree whose directory is gone has no project to protect.
      return [];
    }
  });
  return projectIds.flat();
}

async function _readPlan(repoRoot: string): Promise<SupabasePrunePlanResult> {
  const [dockerProjects, localBranches, worktrees, configContents] =
    await Promise.all([
      DockerInventory.readProjects(repoRoot),
      BranchWorktrees.readLocalBranches(repoRoot),
      BranchWorktrees.readWorktrees(repoRoot),
      readFile(path.join(repoRoot, "supabase", "config.toml"), "utf8"),
    ]);
  return SupabasePrunePlan.make({
    dockerProjects,
    sharedProjectId:
      SupabaseConfig.makeStateFromContents(configContents).projectId,
    localBranches,
    worktrees,
    worktreeProjectIds: await _readWorktreeProjectIds(
      worktrees.map(({ worktreePath }) => {
        return worktreePath;
      }),
    ),
  });
}

function _printCandidates(candidates: readonly PruneCandidate[]): void {
  CliTheme.writeLine({
    stream: process.stdout,
    style: "heading",
    text: `Prune candidates (${candidates.length})`,
  });
  candidates.forEach((candidate) => {
    CliTheme.writeLine({
      stream: process.stdout,
      text: `  ${_makeCandidateLabel(candidate)}`,
    });
  });
}

/** The candidates the flags or the interactive list chose, or why none. */
async function _selectCandidates(
  options: Readonly<{ candidates: PruneCandidate[]; flags: PruneOptions }>,
): Promise<
  | { kind: "selected"; candidates: PruneCandidate[] }
  | { kind: "failed"; message: string; hint: string }
  | { kind: "cancelled" }
> {
  const { candidates, flags } = options;
  if (flags.all === true) {
    return { kind: "selected", candidates };
  }
  if (flags.keep !== undefined) {
    const keepIds = flags.keep.split(/[\s,]+/).filter((id) => {
      return id !== "";
    });
    const unknownIds = keepIds.filter((id) => {
      return !candidates.some(({ project }) => {
        return project.projectId === id;
      });
    });
    return unknownIds.length > 0
      ? {
          kind: "failed",
          message: `--keep names ${unknownIds.join(", ")}, which is not a prune candidate.`,
          hint: "Run `ava supabase prune --dry-run` to see the candidate ids.",
        }
      : {
          kind: "selected",
          candidates: candidates.filter(({ project }) => {
            return !keepIds.includes(project.projectId);
          }),
        };
  }
  if (!TerminalMenu.isAvailable()) {
    return {
      kind: "failed",
      message: "Nothing was pruned: there is no terminal to choose on.",
      hint: "Run `ava supabase prune --all`, `ava supabase prune --keep <id...>`, or `ava supabase prune --dry-run`.",
    };
  }
  const result = await TerminalMenu.prompt({
    title: "Delete these local Supabase projects? Unselect any to keep.",
    hint: "space toggles, a toggles all, ↑/↓ or j/k move, Enter deletes the selected ones, Esc cancels",
    labels: candidates.map(_makeCandidateLabel),
    isMultiSelect: true,
    initialState: {
      cursorIndex: 0,
      selectedIndexes: candidates.map((_candidate, index) => {
        return index;
      }),
    },
  });
  return result.kind === "cancel"
    ? { kind: "cancelled" }
    : {
        kind: "selected",
        candidates: candidates.filter((_candidate, index) => {
          return result.state.selectedIndexes.includes(index);
        }),
      };
}

async function _shouldRemoveImages(
  flags: Readonly<PruneOptions>,
): Promise<boolean> {
  if (flags.images === true || flags.all === true || flags.keep !== undefined) {
    return flags.images === true;
  }
  return await TerminalMenu.confirm({
    question:
      "Also delete the images these projects used, if no other container needs them? The next `supabase start` downloads them again.",
    isYesDefault: false,
  });
}

/** Deletes each project's resources, returning the ids that failed. */
async function _pruneProjects(
  options: Readonly<{
    repoRoot: string;
    candidates: readonly PruneCandidate[];
  }>,
): Promise<string[]> {
  const io = createSupabaseLocalEnvironmentIo(options.repoRoot);
  const failures = await promiseMapSequential(
    options.candidates,
    async ({ project }) => {
      CliTheme.progress(
        `Deleting ${project.projectId} (${_getResourceText(project)})...`,
      );
      const error = await SupabaseDockerCleanup.cleanupTemporaryProject({
        io,
        temporaryProjectId: project.projectId,
      });
      if (error === undefined) {
        CliTheme.success(`Deleted ${project.projectId}.`);
        return [];
      }
      CliTheme.warning(
        `Could not fully delete ${project.projectId}: ${error.message}`,
      );
      return [project.projectId];
    },
  );
  return failures.flat();
}

async function _removeUnusedImages(
  options: Readonly<{
    repoRoot: string;
    candidates: readonly PruneCandidate[];
  }>,
): Promise<void> {
  const imagesInUse = new Set(
    await DockerInventory.readImagesInUse(options.repoRoot),
  );
  const images = [
    ...new Set(
      options.candidates.flatMap(({ project }) => {
        return project.images;
      }),
    ),
  ].filter((image) => {
    return !imagesInUse.has(image);
  });
  if (images.length === 0) {
    CliTheme.info(
      "Every image these projects used is still needed by another container. No images were deleted.",
    );
    return;
  }
  await promiseMapSequential(images, async (image) => {
    CliTheme.progress(`Deleting image ${image}...`);
    const result = await DockerInventory.removeImage({
      projectRoot: options.repoRoot,
      image,
    });
    if (result.ok) {
      CliTheme.success(`Deleted image ${image}.`);
    } else {
      CliTheme.warning(
        `Kept image ${image}: ${result.stderr || "Docker refused to remove it"}`,
      );
    }
  });
}

async function _run(flags: Readonly<PruneOptions>): Promise<void> {
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
  const plan = await _readPlan(repoRoot);
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

async function _pruneSelected(
  options: Readonly<{
    repoRoot: string;
    candidates: PruneCandidate[];
    flags: PruneOptions;
  }>,
): Promise<void> {
  const { repoRoot, flags } = options;
  const selection = await _selectCandidates(options);
  if (selection.kind === "failed") {
    _printCandidates(options.candidates);
    CliTheme.error({
      command: COMMAND_NAME,
      message: selection.message,
      hint: selection.hint,
    });
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
  const shouldRemoveImages = await _shouldRemoveImages(flags);
  const failedIds = await _pruneProjects({
    repoRoot,
    candidates: selection.candidates,
  });
  if (shouldRemoveImages) {
    await _removeUnusedImages({ repoRoot, candidates: selection.candidates });
  }
  if (failedIds.length > 0) {
    CliTheme.error({
      command: COMMAND_NAME,
      message: `${failedIds.join(", ")} still has Docker resources left.`,
      hint: "Read the warnings above, then rerun `ava supabase prune` to retry.",
    });
    process.exitCode = 1;
    return;
  }
  CliTheme.success(
    `Pruned ${_countText({ count: selection.candidates.length, noun: "local Supabase project" })}.`,
  );
}

/** CLI for deleting local Supabase projects whose branch is gone. */
export const SupabasePruneCli = Acclimate.createCLI("prune")
  .description(SupabasePruneHelp.summary)
  .addOption({
    name: "--all",
    description: "Delete every prune candidate without asking.",
    required: false,
    type: "boolean",
  })
  .addOption({
    name: "--keep",
    description: "Project ids to keep; every other candidate is deleted.",
    required: false,
    type: "string",
  })
  .addOption({
    name: "--images",
    description: "Also delete images no remaining container uses.",
    required: false,
    type: "boolean",
  })
  .addOption({
    name: "--dry-run",
    description: "Only list the candidates.",
    required: false,
    type: "boolean",
  })
  .action((commandArguments: Readonly<PruneOptions>) => {
    return _run(commandArguments).catch((error: unknown) => {
      CliTheme.error({
        command: COMMAND_NAME,
        message: error instanceof Error ? error.message : String(error),
        hint: "Check that Docker is running, then retry.",
      });
      process.exitCode = 1;
    });
  });
