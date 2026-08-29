import {
  findUnknownReleaseFlags,
  wantsHelp,
} from "@ava-cli/ReleaseCli/releaseFlagUtils/releaseFlagUtils";
import { describe, expect, it } from "vitest";

describe("findUnknownReleaseFlags", () => {
  it("accepts every supported flag and alias", () => {
    const argv = [
      "release",
      "--version",
      "0.11.0",
      "-n",
      "0.11.1",
      "--yes",
      "--dry-run",
      "--skip-ci-check",
    ];

    expect(findUnknownReleaseFlags(argv)).toEqual([]);
  });

  it("catches a mistyped flag, which would otherwise be ignored silently", () => {
    expect(findUnknownReleaseFlags(["release", "--dryrun"])).toEqual([
      "--dryrun",
    ]);
    expect(findUnknownReleaseFlags(["release", "--dry_run", "--yes"])).toEqual([
      "--dry_run",
    ]);
  });

  it("does not mistake an option value for a flag", () => {
    expect(findUnknownReleaseFlags(["release", "--version", "0.11.0"])).toEqual(
      [],
    );
  });

  it("reports the flag part of an unsupported --flag=value token", () => {
    expect(findUnknownReleaseFlags(["release", "--nope=1"])).toEqual([
      "--nope=1",
    ]);
  });
});

describe("wantsHelp", () => {
  it("detects both help flags", () => {
    expect(wantsHelp(["release", "--help"])).toBe(true);
    expect(wantsHelp(["release", "-h"])).toBe(true);
  });

  it("is false for a real release", () => {
    expect(wantsHelp(["release", "--version", "0.11.0"])).toBe(false);
  });
});
