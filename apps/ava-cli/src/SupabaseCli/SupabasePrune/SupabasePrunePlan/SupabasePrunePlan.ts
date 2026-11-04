import path from "node:path";
import { makeTemporaryProjectIdFromBranch } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/makeTemporaryProjectIdFromBranch/makeTemporaryProjectIdFromBranch";
import type { BranchWorktree } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/BranchWorktrees/BranchWorktrees";

/** One local Supabase project as Docker labels describe it. */
export type DockerSupabaseProject = {
  projectId: string;
  /** Distinct `com.supabase.cli.workdir` labels of its containers. */
  workdirs: string[];
  containerCount: number;
  volumeCount: number;
  networkCount: number;
  isRunning: boolean;
  /** Images its containers run, which other projects may share. */
  images: string[];
};

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

/** Which Docker projects `ava supabase prune` may delete, and why. */
export type SupabasePrunePlanResult = {
  candidates: Array<{
    project: DockerSupabaseProject;
    reason: PruneReason;
    /**
     * Whether a container recorded which removed worktree started it. A
     * project known only by its name could come from another repository, so
     * it is never deleted without being picked by hand.
     */
    isVerified: boolean;
  }>;
  kept: Array<{ project: DockerSupabaseProject; reason: KeepReason }>;
  /** Projects that do not come from this repository's worktrees. */
  ignoredProjectIds: string[];
};

type MakePrunePlanOptions = {
  dockerProjects: readonly DockerSupabaseProject[];
  sharedProjectId: string;
  localBranches: readonly string[];
  worktrees: readonly BranchWorktree[];
  worktreeProjectIds: readonly WorktreeProjectId[];
  /** Container workdirs that still exist on disk. */
  existingWorkdirs: readonly string[];
};

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
    input: MakePrunePlanOptions;
    worktreeRoots: readonly string[];
  }>,
): KeepReason | undefined {
  const { project, input, worktreeRoots } = options;
  const user = input.worktreeProjectIds.find(({ projectId }) => {
    return projectId === project.projectId;
  });
  if (user !== undefined) {
    return { kind: "usedByWorktree", worktreePath: user.worktreePath };
  }
  // A project belongs to a live branch either by its default id or by the
  // worktree it was started in, which custom ids still record.
  const workdirBranches = _getBranchesFromWorkdirs({
    workdirs: project.workdirs,
    worktreeRoots,
  });
  const branch = input.localBranches.find((localBranch) => {
    return (
      _getProjectIdFromBranch(localBranch) === project.projectId ||
      workdirBranches.includes(localBranch)
    );
  });
  if (branch !== undefined) {
    return { kind: "branchExists", branch };
  }
  const liveWorkdir = project.workdirs.find((workdir) => {
    return input.worktrees.some(({ worktreePath }) => {
      return worktreePath === workdir;
    });
  });
  return liveWorkdir === undefined
    ? undefined
    : { kind: "worktreeExists", worktreePath: liveWorkdir };
}

function _getPruneReason(
  options: Readonly<{
    project: DockerSupabaseProject;
    worktreeRoots: readonly string[];
    branchPrefixes: ReadonlySet<string>;
    existingWorkdirs: readonly string[];
  }>,
): PruneReason | undefined {
  const { project, worktreeRoots, branchPrefixes } = options;
  // A removed worktree's path is gone from disk and reads as a prefixed
  // branch under the worktree root, e.g. `<root>/feat/old`. Requiring both
  // keeps a sibling repository out when a short branch's parent is `~/src`.
  const removedWorkdir = project.workdirs.find((workdir) => {
    return (
      !options.existingWorkdirs.includes(workdir) &&
      worktreeRoots.some((root) => {
        const [prefix = "", ...rest] = workdir
          .slice(root.length + 1)
          .split(path.sep);
        return (
          workdir.startsWith(`${root}${path.sep}`) &&
          branchPrefixes.has(prefix) &&
          rest.length > 0
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
  return project.workdirs.length === 0 && branchPrefixes.has(namePrefix)
    ? { kind: "branchGone" }
    : undefined;
}

function _make(
  options: Readonly<MakePrunePlanOptions>,
): SupabasePrunePlanResult {
  const worktreeRoots = _getWorktreeRoots(options.worktrees);
  const branchPrefixes = new Set([
    ...GITFLOW_PREFIXES,
    ...options.localBranches.flatMap((branch) => {
      const [prefix] = branch.split("/");
      return branch.includes("/") && prefix ? [prefix] : [];
    }),
  ]);
  const initialPlan: SupabasePrunePlanResult = {
    candidates: [],
    kept: [],
    ignoredProjectIds: [],
  };
  return options.dockerProjects
    .filter(({ projectId }) => {
      return projectId !== options.sharedProjectId;
    })
    .reduce((plan, project) => {
      const keepReason = _getKeepReason({
        project,
        input: options,
        worktreeRoots,
      });
      if (keepReason !== undefined) {
        return {
          ...plan,
          kept: [...plan.kept, { project, reason: keepReason }],
        };
      }
      const pruneReason = _getPruneReason({
        project,
        worktreeRoots,
        branchPrefixes,
        existingWorkdirs: options.existingWorkdirs,
      });
      return pruneReason === undefined
        ? {
            ...plan,
            ignoredProjectIds: [...plan.ignoredProjectIds, project.projectId],
          }
        : {
            ...plan,
            candidates: [
              ...plan.candidates,
              {
                project,
                reason: pruneReason,
                isVerified: pruneReason.kind === "worktreeRemoved",
              },
            ],
          };
    }, initialPlan);
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
  make: _make,
};
