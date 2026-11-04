import { SupabasePrunePlan } from "@ava-cli/SupabaseCli/SupabasePrune/SupabasePrunePlan/SupabasePrunePlan";
import { describe, expect, it } from "vitest";
import type { DockerSupabaseProject } from "@ava-cli/SupabaseCli/SupabasePrune/SupabasePrunePlan/SupabasePrunePlan";

const ROOT = "/src/worktrees/avandar";

function _makeProject(
  projectId: string,
  workdirs: readonly string[] = [],
): DockerSupabaseProject {
  return {
    projectId,
    workdirs: [...workdirs],
    containerCount: workdirs.length > 0 ? 12 : 0,
    volumeCount: 3,
    networkCount: workdirs.length > 0 ? 1 : 0,
    isRunning: false,
    images: [],
  };
}

const BASE_INPUT = {
  sharedProjectId: "avandar",
  localBranches: ["develop", "feat/nux", "demo/measles"],
  worktrees: [
    { worktreePath: "/src/avandar", branch: "develop" },
    { worktreePath: `${ROOT}/feat/nux`, branch: "feat/nux" },
    { worktreePath: `${ROOT}/demo/measles`, branch: "demo/measles" },
  ],
  worktreeProjectIds: [
    { worktreePath: "/src/avandar", projectId: "avandar" },
    { worktreePath: `${ROOT}/feat/nux`, projectId: "avandar" },
    { worktreePath: `${ROOT}/demo/measles`, projectId: "feat-demo-measles" },
  ],
};

function _makePlan(
  dockerProjects: readonly DockerSupabaseProject[],
  existingWorkdirs: readonly string[] = [],
) {
  return SupabasePrunePlan.make({
    ...BASE_INPUT,
    dockerProjects,
    existingWorkdirs,
  });
}

describe("SupabasePrunePlan.make", () => {
  it("never offers the shared develop project", () => {
    expect(
      _makePlan([_makeProject("avandar", ["/src/avandar"])]).candidates,
    ).toEqual([]);
  });

  it("keeps a project whose name a local branch derives to", () => {
    const plan = _makePlan([_makeProject("feat-nux")]);

    expect(plan.candidates).toEqual([]);
    expect(plan.kept).toEqual([
      {
        project: _makeProject("feat-nux"),
        reason: { kind: "branchExists", branch: "feat/nux" },
      },
    ]);
  });

  it("keeps a project a current worktree points at, whatever its name", () => {
    const plan = _makePlan([_makeProject("feat-demo-measles")]);

    expect(plan.candidates).toEqual([]);
    expect(plan.kept[0]?.reason).toEqual({
      kind: "usedByWorktree",
      worktreePath: `${ROOT}/demo/measles`,
    });
  });

  it("offers a project whose worktree was removed", () => {
    const project = _makeProject("feat-old", [`${ROOT}/feat/old`]);

    expect(_makePlan([project]).candidates).toEqual([
      {
        project,
        reason: { kind: "worktreeRemoved", worktreePath: `${ROOT}/feat/old` },
        isVerified: true,
      },
    ]);
  });

  it("leaves alone a project whose workdir still exists on disk", () => {
    const workdir = `${ROOT}/feat/old`;

    expect(
      _makePlan([_makeProject("feat-old", [workdir])], [workdir])
        .ignoredProjectIds,
    ).toEqual(["feat-old"]);
  });

  it("leaves alone a sibling repository under a short branch's parent", () => {
    const plan = SupabasePrunePlan.make({
      ...BASE_INPUT,
      localBranches: [...BASE_INPUT.localBranches, "nux"],
      worktrees: [
        ...BASE_INPUT.worktrees,
        { worktreePath: "/src/nux", branch: "nux" },
      ],
      dockerProjects: [_makeProject("other-app", ["/src/other-app"])],
      existingWorkdirs: [],
    });

    expect(plan.ignoredProjectIds).toEqual(["other-app"]);
  });

  it("keeps a project whose worktree is gone but whose branch still exists", () => {
    const project = _makeProject("custom-id", [`${ROOT}/feat/nux-old`]);
    const plan = SupabasePrunePlan.make({
      ...BASE_INPUT,
      localBranches: [...BASE_INPUT.localBranches, "feat/nux-old"],
      dockerProjects: [project],
      existingWorkdirs: [],
    });

    expect(plan.candidates).toEqual([]);
    expect(plan.kept[0]?.reason).toEqual({
      kind: "branchExists",
      branch: "feat/nux-old",
    });
  });

  it("offers a volume-only project named like a branch that no longer exists", () => {
    const project = _makeProject("fix-gone");

    expect(_makePlan([project]).candidates).toEqual([
      { project, reason: { kind: "branchGone" }, isVerified: false },
    ]);
  });

  it("leaves alone a project that belongs to another repository", () => {
    const plan = _makePlan([
      _makeProject("avandar-internal", ["/src/avandar-internal"]),
    ]);

    expect(plan.candidates).toEqual([]);
    expect(plan.ignoredProjectIds).toEqual(["avandar-internal"]);
  });

  it("leaves alone a volume-only project whose name is not branch-shaped", () => {
    expect(
      _makePlan([_makeProject("scratch-project")]).ignoredProjectIds,
    ).toEqual(["scratch-project"]);
  });
});
