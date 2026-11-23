import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  AVA_GLOBAL_FLAGS,
  describeUnknownReleaseFlags,
  findUnknownReleaseFlags,
  RELEASE_FLAGS,
  RELEASE_VALUE_FLAGS,
  wantsHelp,
} from "@ava-cli/ReleaseCli/releaseFlagUtils/releaseFlagUtils";
import { describe, expect, it } from "vitest";
import type { ReleaseFlagProblem } from "@ava-cli/ReleaseCli/releaseFlagUtils/releaseFlagUtils";

/** `findUnknownReleaseFlags` against the flags `ava release` accepts. */
function _findUnknownFlagsForRelease(
  argv: readonly string[],
): readonly ReleaseFlagProblem[] {
  return findUnknownReleaseFlags({
    argv,
    acceptedFlags: RELEASE_FLAGS,
    valueFlags: RELEASE_VALUE_FLAGS,
  });
}

/**
 * The dashes a pasted `--dry-run` can arrive with once an editor autocorrects
 * its two hyphens: an en dash, an em dash, and a minus sign. Written as escapes
 * so the source holds no long dash.
 */
const UNICODE_DASHES = ["\u2013", "\u2014", "\u2212"] as const;

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

  it("accepts the global --env option and its value", () => {
    expect(
      _findUnknownFlagsForRelease(["release", "--env", "staging"]),
    ).toEqual([]);
  });

  it("accepts the value after each value-taking alias", () => {
    expect(
      _findUnknownFlagsForRelease(["release", "-v", "0.15.0", "-n", "0.15.1"]),
    ).toEqual([]);
  });

  it("accepts the command words before the first flag", () => {
    expect(
      findUnknownReleaseFlags({
        argv: ["release", "notes", "--update"],
        acceptedFlags: ["--update"],
        valueFlags: [],
      }),
    ).toEqual([]);
  });

  it("catches a mistyped flag, which would otherwise be ignored silently", () => {
    expect(_findUnknownFlagsForRelease(["release", "--dryrun"])).toEqual([
      { kind: "unknown-flag", token: "--dryrun" },
    ]);
    expect(
      _findUnknownFlagsForRelease(["release", "--dry_run", "--yes"]),
    ).toEqual([{ kind: "unknown-flag", token: "--dry_run" }]);
  });

  it("does not mistake an option value for a flag", () => {
    expect(
      _findUnknownFlagsForRelease(["release", "--version", "0.11.0"]),
    ).toEqual([]);
  });

  it("does not read a value containing = as a --flag=value token", () => {
    expect(
      _findUnknownFlagsForRelease(["release", "--version", "a=b"]),
    ).toEqual([]);
  });

  it.each(["--yes", "-y", "--dry-run", "--skip-ci-check", "--skip-changelog"])(
    "refuses a bare word after the switch %s, which would become its value",
    (switchFlag) => {
      expect(
        _findUnknownFlagsForRelease(["release", switchFlag, "dry-run"]),
      ).toEqual([{ kind: "stray-value", token: "dry-run" }]);
    },
  );

  it("refuses a bare word after ava release notes --update", () => {
    expect(
      findUnknownReleaseFlags({
        argv: ["release", "notes", "--update", "dry-run"],
        acceptedFlags: ["--version", "--update", "--dry-run"],
        valueFlags: ["--version"],
      }),
    ).toEqual([{ kind: "stray-value", token: "dry-run" }]);
  });

  it("refuses a second word after a value-taking flag's value", () => {
    expect(
      _findUnknownFlagsForRelease(["release", "--version", "0.15.0", "0.15.1"]),
    ).toEqual([{ kind: "stray-value", token: "0.15.1" }]);
  });

  it.each(UNICODE_DASHES)(
    "refuses a flag whose dashes became the long dash %s",
    (dash) => {
      const token = `${dash}dry-run`;

      expect(_findUnknownFlagsForRelease(["release", "--yes", token])).toEqual([
        { kind: "unicode-dash-flag", token },
      ]);
    },
  );

  it("refuses a long-dash flag in place of the first flag", () => {
    const token = "\u2013dry-run";

    expect(_findUnknownFlagsForRelease(["release", token])).toEqual([
      { kind: "unicode-dash-flag", token },
    ]);
  });

  it("does not take a long-dash flag as a value-taking flag's value", () => {
    const token = "\u2014yes";

    expect(
      _findUnknownFlagsForRelease(["release", "--version", token]),
    ).toEqual([{ kind: "unicode-dash-flag", token }]);
  });

  it("refuses --dry-run=true as an inline value even though --dry-run is accepted", () => {
    expect(
      _findUnknownFlagsForRelease(["release", "--dry-run=true", "--yes"]),
    ).toEqual([
      {
        kind: "inline-value",
        token: "--dry-run=true",
        flag: "--dry-run",
        value: "true",
        takesValue: false,
      },
    ]);
  });

  it("refuses --version=1.0.0 as an inline value of a value-taking flag", () => {
    expect(_findUnknownFlagsForRelease(["release", "--version=1.0.0"])).toEqual(
      [
        {
          kind: "inline-value",
          token: "--version=1.0.0",
          flag: "--version",
          value: "1.0.0",
          takesValue: true,
        },
      ],
    );
  });

  it("refuses an unsupported --flag=value token whole, as an unknown flag", () => {
    expect(_findUnknownFlagsForRelease(["release", "--nope=1"])).toEqual([
      { kind: "unknown-flag", token: "--nope=1" },
    ]);
  });

  it("uses the given acceptedFlags, not RELEASE_FLAGS", () => {
    expect(
      findUnknownReleaseFlags({
        argv: ["notes", "--update", "--next", "0.1.1"],
        acceptedFlags: ["--update"],
        valueFlags: [],
      }),
    ).toEqual([
      { kind: "unknown-flag", token: "--next" },
      { kind: "stray-value", token: "0.1.1" },
    ]);
  });
});

describe("describeUnknownReleaseFlags", () => {
  it("names a single unknown flag", () => {
    expect(
      describeUnknownReleaseFlags([
        { kind: "unknown-flag", token: "--dryrun" },
      ]),
    ).toBe("Unknown option: --dryrun.");
  });

  it("names several unknown flags in the plural", () => {
    expect(
      describeUnknownReleaseFlags([
        { kind: "unknown-flag", token: "--dryrun" },
        { kind: "unknown-flag", token: "--alpha" },
      ]),
    ).toBe("Unknown options: --dryrun, --alpha.");
  });

  it("calls an unknown --flag=value token an unknown option", () => {
    expect(
      describeUnknownReleaseFlags([
        { kind: "unknown-flag", token: "--nope=1" },
      ]),
    ).toBe("Unknown option: --nope=1.");
  });

  it("tells the user to pass a switch on its own", () => {
    expect(
      describeUnknownReleaseFlags([
        {
          kind: "inline-value",
          token: "--dry-run=true",
          flag: "--dry-run",
          value: "true",
          takesValue: false,
        },
      ]),
    ).toBe("Pass `--dry-run` on its own, not `--dry-run=true`.");
  });

  it("tells the user to write a value-taking flag and its value as two words", () => {
    expect(
      describeUnknownReleaseFlags([
        {
          kind: "inline-value",
          token: "--version=1.0.0",
          flag: "--version",
          value: "1.0.0",
          takesValue: true,
        },
      ]),
    ).toBe("Write `--version 1.0.0`, not `--version=1.0.0`.");
  });

  it("names a stray word and says which flags take a value", () => {
    expect(
      describeUnknownReleaseFlags([{ kind: "stray-value", token: "dry-run" }]),
    ).toBe(
      "Unexpected word: dry-run. A flag starts with `--`, and only an " +
        "option such as `--version` takes a value.",
    );
  });

  it("tells the user to retype a long-dash flag with plain hyphens", () => {
    const token = "\u2013dry-run";

    expect(
      describeUnknownReleaseFlags([{ kind: "unicode-dash-flag", token }]),
    ).toBe(`Retype the dashes as plain hyphens (-): ${token}.`);
  });

  it("reports each kind of problem in its own sentence", () => {
    expect(
      describeUnknownReleaseFlags([
        { kind: "unknown-flag", token: "--dryrun" },
        {
          kind: "inline-value",
          token: "--version=1.0.0",
          flag: "--version",
          value: "1.0.0",
          takesValue: true,
        },
        { kind: "stray-value", token: "yes" },
      ]),
    ).toBe(
      "Unknown option: --dryrun. Unexpected word: yes. A flag starts with " +
        "`--`, and only an option such as `--version` takes a value. " +
        "Write `--version 1.0.0`, not `--version=1.0.0`.",
    );
  });
});

describe("AVA_GLOBAL_FLAGS", () => {
  it("names exactly the global options the root ava CLI declares", () => {
    const mainSource = readFileSync(
      fileURLToPath(new URL("../../main.ts", import.meta.url)),
      "utf8",
    );
    const declaredGlobalFlags = [
      ...mainSource.matchAll(/addGlobalOption\(\{\s*name:\s*"([^"]+)"/g),
    ].map((matchResult) => {
      return matchResult[1];
    });

    expect(declaredGlobalFlags.length).toBeGreaterThan(0);
    expect([...AVA_GLOBAL_FLAGS]).toEqual(declaredGlobalFlags);
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
