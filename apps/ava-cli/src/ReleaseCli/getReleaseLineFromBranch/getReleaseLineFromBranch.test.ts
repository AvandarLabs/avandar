import {
  getReleaseLineFromBranch,
  MAINLINE_RELEASE_LINE,
} from "@ava-cli/ReleaseCli/getReleaseLineFromBranch/getReleaseLineFromBranch";
import { describe, expect, it } from "vitest";

describe("getReleaseLineFromBranch", () => {
  it("releases mainline from develop", () => {
    expect(getReleaseLineFromBranch("develop")).toBe(MAINLINE_RELEASE_LINE);
  });

  it.each(["alpha-dev", "alpha", "main", "demo/measles", "feat/x", undefined])(
    "refuses %s",
    (branch) => {
      expect(getReleaseLineFromBranch(branch)).toBeUndefined();
    },
  );
});

describe("release lines", () => {
  it("mainline cuts main from develop with its own suffixes and workflows", () => {
    expect(MAINLINE_RELEASE_LINE).toMatchObject({
      kind: "mainline",
      sourceBranch: "develop",
      targetBranch: "main",
      releaseSuffix: "",
      devSuffix: "-dev",
      sourceCiWorkflow: "staging.yaml",
      targetDeployWorkflow: "production.yaml",
    });
  });

  it("warns that pushing main deploys production", () => {
    expect(MAINLINE_RELEASE_LINE.deployWarning).toBe(
      "Pushing main deploys production and migrates the production database.",
    );
  });
});
