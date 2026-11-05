import path from "node:path";
import { makeTemporaryProjectIdFromBranch } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/makeTemporaryProjectIdFromBranch/makeTemporaryProjectIdFromBranch";
import { propEq, propNotEq } from "@avandar/utils";
import type { BranchWorktree } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/BranchWorktrees/BranchWorktrees";
import type { DockerSupabaseProject } from "@ava-cli/SupabaseCli/SupabasePruneCli/DockerInventory/DockerInventory";

/** The project id a worktree's Supabase CLI resolves to today. */
export type WorktreeProjectId = {
  worktreePath: string;
  projectId: string;
};

/** Why a project is safe to delete. */
export type PruneReason =
  | { kind: "worktreeRemoved"; worktreePath: string }
  | { kind: "branchGone" };

/** Why a project has to stay. */
export type KeepReason =
  | { kind: "usedByWorktree"; worktreePath: string }
  | { kind: "branchExists"; branch: string }
  | { kind: "worktreeExists"; worktreePath: string };

/** One project `ava supabase prune` may delete. */
export type PruneCandidate = {
  project: DockerSupabaseProject;
  reason: PruneReason;
  /**
   * Whether a container recorded which removed worktree started it. A project
   * known only by its name could come from another repository, so it is never
   * deleted without being picked by hand.
   */
  isVerified: boolean;
};

/** Which Docker projects `ava supabase prune` may delete, and why. */
export type SupabasePrunePlanResult = {
  candidates: PruneCandidate[];
  kept: Array<{ project: DockerSupabaseProject; reason: KeepReason }>;
  /** Projects that do not come from this repository's worktrees. */
  ignoredProjectIds: string[];
};

type PrunePlanSources = {
  dockerProjects: readonly DockerSupabaseProject[];
  sharedProjectId: string;
  localBranches: readonly string[];
  worktrees: readonly BranchWorktree[];
  worktreeProjectIds: readonly WorktreeProjectId[];
  /** Container workdirs that still exist on disk. */
  existingWorkdirs: readonly string[];
};

/** What the plan derives from its sources once, before classifying. */
type PrunePlanContext = {
  sources: PrunePlanSources;
  worktreeRoots: readonly string[];
  branchPrefixes: ReadonlySet<string>;
};

/** Where one project lands in the plan. */
type ProjectClassification =
  | { kind: "kept"; reason: KeepReason }
  | { kind: "candidate"; reason: PruneReason }
  | { kind: "ignored" };

/** Branch prefixes a branch-derived project id starts with. */
const GITFLOW_PREFIXES = ["feat", "fix", "refactor", "chore", "docs", "test"];

function _getProjectIdFromBranch(branch: string): string | undefined {
  try {
    return makeTemporaryProjectIdFromBranch(branch);
  } catch {
    return undefined;
  }
}

/**
 * Directories this repository's worktrees live under, found from every
 * worktree whose path ends with its own branch name, e.g. `<root>/feat/nux`.
 */
function _getWorktreeRoots(worktrees: readonly BranchWorktree[]): string[] {
  return [
    ...new Set(
      worktrees.flatMap(({ worktreePath, branch }) => {
        return branch !== undefined &&
          worktreePath.endsWith(`${path.sep}${branch}`)
          ? [worktreePath.slice(0, -(branch.length + 1))]
          : [];
      }),
    ),
  ];
}

function _getBranchPrefixes(localBranches: readonly string[]): Set<string> {
  return new Set([
    ...GITFLOW_PREFIXES,
    ...localBranches.flatMap((branch) => {
      const [prefix] = branch.split("/");
      return branch.includes("/") && prefix ? [prefix] : [];
    }),
  ]);
}

/**
 * The branch a workdir under a worktree root was named after, e.g.
 * `feat/nux` for `<root>/feat/nux`.
 */
function _getBranchesFromWorkdirs(
  options: Readonly<{
    workdirs: readonly string[];
    worktreeRoots: readonly string[];
  }>,
): string[] {
  return options.workdirs.flatMap((workdir) => {
    return options.worktreeRoots.flatMap((root) => {
      return workdir.startsWith(`${root}${path.sep}`)
        ? [workdir.slice(root.length + 1)]
        : [];
    });
  });
}

function _getKeepReason(
  options: Readonly<{
    project: DockerSupabaseProject;
    context: PrunePlanContext;
  }>,
): KeepReason | undefined {
  const { project, context } = options;
  const { sources } = context;
  const worktreeUsingProject = sources.worktreeProjectIds.find(
    propEq("projectId", project.projectId),
  );
  if (worktreeUsingProject !== undefined) {
    return {
      kind: "usedByWorktree",
      worktreePath: worktreeUsingProject.worktreePath,
    };
  }
  // A project belongs to a live branch either by its default id or by the
  // worktree it was started in, which custom ids still record.
  const workdirBranches = _getBranchesFromWorkdirs({
    workdirs: project.workdirs,
    worktreeRoots: context.worktreeRoots,
  });
  const branch = sources.localBranches.find((localBranch) => {
    return (
      _getProjectIdFromBranch(localBranch) === project.projectId ||
      workdirBranches.includes(localBranch)
    );
  });
  if (branch !== undefined) {
    return { kind: "branchExists", branch };
  }
  const liveWorkdir = project.workdirs.find((workdir) => {
    return sources.worktrees.some(propEq("worktreePath", workdir));
  });
  return liveWorkdir === undefined
    ? undefined
    : { kind: "worktreeExists", worktreePath: liveWorkdir };
}

function _getPruneReason(
  options: Readonly<{
    project: DockerSupabaseProject;
    context: PrunePlanContext;
  }>,
): PruneReason | undefined {
  const { project, context } = options;
  // A removed worktree's path is gone from disk and reads as a prefixed
  // branch under the worktree root, e.g. `<root>/feat/old`. Requiring both
  // keeps a sibling repository out when a short branch's parent is `~/src`.
  const removedWorkdir = project.workdirs.find((workdir) => {
    return (
      !context.sources.existingWorkdirs.includes(workdir) &&
      context.worktreeRoots.some((root) => {
        const [prefix = "", ...branchPathSegments] = workdir
          .slice(root.length + 1)
          .split(path.sep);
        return (
          workdir.startsWith(`${root}${path.sep}`) &&
          context.branchPrefixes.has(prefix) &&
          branchPathSegments.length > 0
        );
      })
    );
  });
  if (removedWorkdir !== undefined) {
    return { kind: "worktreeRemoved", worktreePath: removedWorkdir };
  }
  // Containers record where they were started, so a workdir elsewhere means
  // another repository. Only a project with no containers left falls back to
  // whether its name looks like one of this repository's branches.
  const [namePrefix = ""] = project.projectId.split("-");
  return project.workdirs.length === 0 && context.branchPrefixes.has(namePrefix)
    ? { kind: "branchGone" }
    : undefined;
}

function _classifyProject(
  options: Readonly<{
    project: DockerSupabaseProject;
    context: PrunePlanContext;
  }>,
): ProjectClassification {
  const keepReason = _getKeepReason(options);
  if (keepReason !== undefined) {
    return { kind: "kept", reason: keepReason };
  }
  const pruneReason = _getPruneReason(options);
  return pruneReason === undefined
    ? { kind: "ignored" }
    : { kind: "candidate", reason: pruneReason };
}

function _fromDockerProjects(
  sources: Readonly<PrunePlanSources>,
): SupabasePrunePlanResult {
  const context: PrunePlanContext = {
    sources,
    worktreeRoots: _getWorktreeRoots(sources.worktrees),
    branchPrefixes: _getBranchPrefixes(sources.localBranches),
  };
  const classified = sources.dockerProjects
    .filter(propNotEq("projectId", sources.sharedProjectId))
    .map((project) => {
      return {
        project,
        classification: _classifyProject({ project, context }),
      };
    });
  return {
    candidates: classified.flatMap(({ project, classification }) => {
      return classification.kind === "candidate"
        ? [
            {
              project,
              reason: classification.reason,
              isVerified: classification.reason.kind === "worktreeRemoved",
            },
          ]
        : [];
    }),
    kept: classified.flatMap(({ project, classification }) => {
      return classification.kind === "kept"
        ? [{ project, reason: classification.reason }]
        : [];
    }),
    ignoredProjectIds: classified.flatMap(({ project, classification }) => {
      return classification.kind === "ignored" ? [project.projectId] : [];
    }),
  };
}

/**
 * Sorts this machine's local Supabase projects into the ones whose branch or
 * worktree is gone, the ones still in use, and the ones from elsewhere.
 *
 * `ava supabase prune` offers only `candidates` for deletion. The shared
 * develop project, any project a current worktree points at, and any project
 * named after a branch that still exists are never offered.
 */
export const SupabasePrunePlan = {
  /** The plan for the Docker projects and worktrees in `sources`. */
  fromDockerProjects: _fromDockerProjects,
};
