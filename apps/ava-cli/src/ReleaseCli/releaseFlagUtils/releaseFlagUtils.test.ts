import {
  describeUnknownReleaseFlags,
  findUnknownReleaseFlags,
  RELEASE_FLAGS,
  wantsHelp,
} from "@ava-cli/ReleaseCli/releaseFlagUtils/releaseFlagUtils";
import { describe, expect, it } from "vitest";

/** `findUnknownReleaseFlags` against the flags `ava release` accepts. */
function _findUnknownFlagsForRelease(
  argv: readonly string[],
): readonly string[] {
  return findUnknownReleaseFlags({ argv, acceptedFlags: RELEASE_FLAGS });
}

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
      "--skip-changelog",
    ];

    expect(_findUnknownFlagsForRelease(argv)).toEqual([]);
  });

  it("accepts the global --env option", () => {
    expect(
      _findUnknownFlagsForRelease(["release", "--env", "staging"]),
    ).toEqual([]);
  });

  it("catches a mistyped flag, which would otherwise be ignored silently", () => {
    expect(_findUnknownFlagsForRelease(["release", "--dryrun"])).toEqual([
      "--dryrun",
    ]);
    expect(
      _findUnknownFlagsForRelease(["release", "--dry_run", "--yes"]),
    ).toEqual(["--dry_run"]);
  });

  it("does not mistake an option value for a flag", () => {
    expect(
      _findUnknownFlagsForRelease(["release", "--version", "0.11.0"]),
    ).toEqual([]);
  });

  it("refuses --dry-run=true even though --dry-run is accepted", () => {
    expect(
      _findUnknownFlagsForRelease(["release", "--dry-run=true", "--yes"]),
    ).toEqual(["--dry-run=true"]);
  });

  it("refuses an unsupported --flag=value token whole", () => {
    expect(_findUnknownFlagsForRelease(["release", "--nope=1"])).toEqual([
      "--nope=1",
    ]);
  });

  it("checks argv against the accepted flags it is given", () => {
    expect(
      findUnknownReleaseFlags({
        argv: ["notes", "--update", "--next", "0.1.1"],
        acceptedFlags: ["--update"],
      }),
    ).toEqual(["--next"]);
  });
});

describe("describeUnknownReleaseFlags", () => {
  it("names a single unknown flag", () => {
    expect(describeUnknownReleaseFlags(["--dryrun"])).toBe(
      "Unknown option: --dryrun.",
    );
  });

  it("names several unknown flags in the plural", () => {
    expect(describeUnknownReleaseFlags(["--dryrun", "--alpha"])).toBe(
      "Unknown options: --dryrun, --alpha.",
    );
  });

  it("tells the user to pass a --flag=value token as two words", () => {
    expect(describeUnknownReleaseFlags(["--dry-run=true"])).toBe(
      'Use "--flag value", not "--flag=value": --dry-run=true.',
    );
  });

  it("reports unknown flags and --flag=value tokens separately", () => {
    expect(describeUnknownReleaseFlags(["--dryrun", "--version=1.0.0"])).toBe(
      "Unknown option: --dryrun. " +
        'Use "--flag value", not "--flag=value": --version=1.0.0.',
    );
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
