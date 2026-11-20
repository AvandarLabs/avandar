import {
  ALPHA_RELEASE_LINE,
  getReleaseLineFromBranch,
  MAINLINE_RELEASE_LINE,
  RELEASE_SOURCE_BRANCHES,
} from "@ava-cli/ReleaseCli/releaseLine/releaseLine";
import { describe, expect, it } from "vitest";

describe("getReleaseLineFromBranch", () => {
  it("releases mainline from develop", () => {
    expect(getReleaseLineFromBranch("develop")).toBe(MAINLINE_RELEASE_LINE);
  });

  it("releases alpha from alpha-dev", () => {
    expect(getReleaseLineFromBranch("alpha-dev")).toBe(ALPHA_RELEASE_LINE);
  });

  it.each(["main", "alpha", "demo/measles", "feat/x", undefined])(
    "refuses %s",
    (branch) => {
      expect(getReleaseLineFromBranch(branch)).toBeUndefined();
    },
  );
});

describe("release lines", () => {
  it("mainline cuts main from develop with no release suffix", () => {
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

  it("alpha cuts alpha from alpha-dev with the -alpha suffix", () => {
    expect(ALPHA_RELEASE_LINE).toMatchObject({
      kind: "alpha",
      sourceBranch: "alpha-dev",
      targetBranch: "alpha",
      releaseSuffix: "-alpha",
      devSuffix: "-alpha-dev",
      sourceCiWorkflow: "alpha-dev.yaml",
      targetDeployWorkflow: "alpha.yaml",
    });
  });

  it("lists every source branch a release may run on", () => {
    expect(RELEASE_SOURCE_BRANCHES).toEqual(["develop", "alpha-dev"]);
  });
});
