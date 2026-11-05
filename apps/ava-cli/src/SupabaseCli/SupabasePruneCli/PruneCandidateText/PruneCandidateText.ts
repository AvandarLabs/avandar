import os from "node:os";
import path from "node:path";
import { match } from "ts-pattern";
import type { DockerSupabaseProject } from "@ava-cli/SupabaseCli/SupabasePruneCli/DockerInventory/DockerInventory";
import type {
  PruneCandidate,
  PruneReason,
} from "@ava-cli/SupabaseCli/SupabasePruneCli/SupabasePrunePlan/SupabasePrunePlan";

function _getTildePathFromFilePath(filePath: string): string {
  const homeDirectory = os.homedir();
  return filePath.startsWith(`${homeDirectory}${path.sep}`)
    ? `~${filePath.slice(homeDirectory.length)}`
    : filePath;
}

function _fromCount(
  options: Readonly<{ numItems: number; noun: string }>,
): string {
  const { numItems, noun } = options;
  return `${numItems} ${noun}${numItems === 1 ? "" : "s"}`;
}

function _fromProjectResources(
  project: Readonly<DockerSupabaseProject>,
): string {
  const runningSuffix = project.isRunning ? ", running" : "";
  return [
    _fromCount({ numItems: project.numContainers, noun: "container" }),
    _fromCount({ numItems: project.numVolumes, noun: "volume" }),
    `${_fromCount({ numItems: project.numNetworks, noun: "network" })}${runningSuffix}`,
  ].join(", ");
}

function _fromCandidate(candidate: Readonly<PruneCandidate>): string {
  const reasonText = match<PruneReason, string>(candidate.reason)
    .with({ kind: "worktreeRemoved" }, ({ worktreePath }) => {
      return `worktree ${_getTildePathFromFilePath(worktreePath)} no longer exists`;
    })
    .with({ kind: "branchGone" }, () => {
      return "no local branch matches it";
    })
    .exhaustive();
  const unverifiedSuffix = candidate.isVerified
    ? ""
    : " [name only, not preselected]";
  return `${candidate.project.projectId}  (${reasonText}; ${_fromProjectResources(candidate.project)})${unverifiedSuffix}`;
}

/**
 * The plain-text descriptions `ava supabase prune` prints for its candidates:
 * one line per project in the menu and in `--dry-run`, plus the resource
 * counts in each deletion's progress line.
 */
export const PruneCandidateText = {
  /** A count with its noun, pluralised unless there is exactly one. */
  fromCount: _fromCount,

  /** How many containers, volumes, and networks a project holds. */
  fromProjectResources: _fromProjectResources,

  /** One candidate's id, why it is offered, and what deleting it removes. */
  fromCandidate: _fromCandidate,
};
