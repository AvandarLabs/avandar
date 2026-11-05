import { PruneSelection } from "@ava-cli/SupabaseCli/SupabasePruneCli/PruneSelection/PruneSelection";
import { describe, expect, it } from "vitest";
import type { PruneCandidate } from "@ava-cli/SupabaseCli/SupabasePruneCli/SupabasePrunePlan/SupabasePrunePlan";

function _makeCandidate(
  options: Readonly<{ projectId: string; isVerified: boolean }>,
): PruneCandidate {
  return {
    project: {
      projectId: options.projectId,
      workdirs: [],
      numContainers: 0,
      numVolumes: 1,
      numNetworks: 0,
      isRunning: false,
      images: [],
    },
    reason: options.isVerified
      ? { kind: "worktreeRemoved", worktreePath: `/wt/${options.projectId}` }
      : { kind: "branchGone" },
    isVerified: options.isVerified,
  };
}

const VERIFIED = _makeCandidate({ projectId: "feat-a", isVerified: true });
const OTHER_VERIFIED = _makeCandidate({
  projectId: "feat-b",
  isVerified: true,
});
const NAME_ONLY = _makeCandidate({ projectId: "fix-c", isVerified: false });
const CANDIDATES = [VERIFIED, OTHER_VERIFIED, NAME_ONLY];

describe("PruneSelection.select", () => {
  it("picks every verified candidate for --all", async () => {
    await expect(
      PruneSelection.select({ candidates: CANDIDATES, flags: { all: true } }),
    ).resolves.toEqual({
      kind: "selected",
      candidates: [VERIFIED, OTHER_VERIFIED],
    });
  });

  it("adds name-only candidates to --all with --include-unverified", async () => {
    await expect(
      PruneSelection.select({
        candidates: CANDIDATES,
        flags: { all: true, includeUnverified: true },
      }),
    ).resolves.toEqual({ kind: "selected", candidates: CANDIDATES });
  });

  it("picks every verified candidate except the ids --keep names", async () => {
    await expect(
      PruneSelection.select({
        candidates: CANDIDATES,
        flags: { keep: "feat-a, fix-c" },
      }),
    ).resolves.toEqual({ kind: "selected", candidates: [OTHER_VERIFIED] });
  });

  it("refuses a --keep id that is not a candidate", async () => {
    await expect(
      PruneSelection.select({
        candidates: CANDIDATES,
        flags: { keep: "feat-nope" },
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        kind: "failed",
        message: expect.stringContaining("feat-nope"),
      }),
    );
  });
});

describe("PruneSelection.shouldDeleteImages", () => {
  it("deletes images in an unattended run only with --images", async () => {
    await expect(
      Promise.all([
        PruneSelection.shouldDeleteImages({ all: true }),
        PruneSelection.shouldDeleteImages({ all: true, images: true }),
      ]),
    ).resolves.toEqual([false, true]);
  });
});
