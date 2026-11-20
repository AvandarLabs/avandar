import {
  ALPHA_RELEASE_LINE,
  getReleaseLineFromBranch,
  MAINLINE_RELEASE_LINE,
} from "@ava-cli/ReleaseCli/getReleaseLineFromBranch/getReleaseLineFromBranch";
import { describe, expect, it } from "vitest";

describe("getReleaseLineFromBranch", () => {
  it("releases mainline from develop", () => {
    expect(getReleaseLineFromBranch("develop")).toBe(MAINLINE_RELEASE_LINE);
  });

  it("releases alpha from alpha-dev", () => {
    expect(getReleaseLineFromBranch("alpha-dev")).toBe(ALPHA_RELEASE_LINE);
  });

  it.each(["main", "alpha", "demo/measles", "feat/x", undefined])(
    "finds no release line for %s",
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
      bannerTitle: "MAINLINE release",
      bannerColor: "bright_cyan",
      deployWarning:
        "Pushing main deploys the mainline test URL. It does not touch production.",
    });
  });

  it("alpha cuts alpha from alpha-dev with its own suffixes and workflows", () => {
    expect(ALPHA_RELEASE_LINE).toMatchObject({
      kind: "alpha",
      sourceBranch: "alpha-dev",
      targetBranch: "alpha",
      releaseSuffix: "-alpha",
      devSuffix: "-alpha-dev",
      sourceCiWorkflow: "alpha-dev.yaml",
      targetDeployWorkflow: "alpha.yaml",
      bannerTitle: "ALPHA release",
      bannerColor: "bright_yellow",
      deployWarning:
        "Pushing alpha deploys PRODUCTION (app.avandarlabs.com) and migrates the production database.",
    });
  });
});
