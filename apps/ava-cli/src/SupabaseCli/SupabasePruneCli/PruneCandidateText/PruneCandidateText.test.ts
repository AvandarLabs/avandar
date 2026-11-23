import os from "node:os";
import { PruneCandidateText } from "@ava-cli/SupabaseCli/SupabasePruneCli/PruneCandidateText/PruneCandidateText";
import { describe, expect, it } from "vitest";
import type { DockerSupabaseProject } from "@ava-cli/SupabaseCli/SupabasePruneCli/DockerInventory/DockerInventory";

const PROJECT: DockerSupabaseProject = {
  projectId: "feat-old",
  workdirs: [],
  numContainers: 1,
  numVolumes: 3,
  numNetworks: 0,
  isRunning: true,
  images: [],
};

describe("PruneCandidateText.fromCount", () => {
  it("keeps a single item's noun singular", () => {
    expect(PruneCandidateText.fromCount({ numItems: 1, noun: "volume" })).toBe(
      "1 volume",
    );
  });

  it("pluralises the noun for zero or several items", () => {
    expect(
      [0, 2].map((numItems) => {
        return PruneCandidateText.fromCount({ numItems, noun: "network" });
      }),
    ).toEqual(["0 networks", "2 networks"]);
  });
});

describe("PruneCandidateText.fromProjectResources", () => {
  it("counts each resource type and marks a running project", () => {
    expect(PruneCandidateText.fromProjectResources(PROJECT)).toBe(
      "1 container, 3 volumes, 0 networks, running",
    );
  });
});

describe("PruneCandidateText.fromCandidate", () => {
  it("shows a removed worktree's path relative to the home directory", () => {
    expect(
      PruneCandidateText.fromCandidate({
        project: { ...PROJECT, isRunning: false },
        reason: {
          kind: "worktreeRemoved",
          worktreePath: `${os.homedir()}/src/worktrees/avandar/feat/old`,
        },
        isVerified: true,
      }),
    ).toBe(
      "feat-old  (worktree ~/src/worktrees/avandar/feat/old no longer exists; 1 container, 3 volumes, 0 networks)",
    );
  });

  it("tags a name-only candidate as not preselected", () => {
    expect(
      PruneCandidateText.fromCandidate({
        project: PROJECT,
        reason: { kind: "branchGone" },
        isVerified: false,
      }),
    ).toMatch(/\[name only, not preselected\]$/);
  });
});
