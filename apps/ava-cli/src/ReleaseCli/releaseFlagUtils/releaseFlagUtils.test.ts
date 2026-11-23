import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { ReleaseCli } from "@ava-cli/ReleaseCli/ReleaseCli";
import {
  AVA_GLOBAL_FLAGS,
  createReleaseFlagSpecFromOptions,
  describeReleaseFlagProblems,
  getReleaseFlagProblemsFromArgv,
  wantsHelp,
} from "@ava-cli/ReleaseCli/releaseFlagUtils/releaseFlagUtils";
import { describe, expect, it } from "vitest";
import type { ReleaseFlagProblem } from "@ava-cli/ReleaseCli/releaseFlagUtils/releaseFlagUtils";

/** The options `ava release` declares, as the release filter sees them. */
const RELEASE_FLAG_SPEC = createReleaseFlagSpecFromOptions(
  ReleaseCli.state.optionArgs,
);

/** `getReleaseFlagProblemsFromArgv` against the options `ava release` takes. */
function _getReleaseFlagProblemsForRelease(
  argv: readonly string[],
): readonly ReleaseFlagProblem[] {
  return getReleaseFlagProblemsFromArgv({ argv, ...RELEASE_FLAG_SPEC });
}

/**
 * The dashes a pasted `--dry-run` can arrive with once an editor autocorrects
 * its two hyphens: an en dash, an em dash, and a minus sign. Written as escapes
 * so the source holds no long dash.
 */
const UNICODE_DASHES = ["\u2013", "\u2014", "\u2212"] as const;

/** One problem of every kind, so a new kind must be added here to compile. */
const PROBLEM_OF_EACH_KIND: Record<
  ReleaseFlagProblem["kind"],
  ReleaseFlagProblem
> = {
  "unknown-flag": { kind: "unknown-flag", token: "--dryrun" },
  "inline-value": {
    kind: "inline-value",
    token: "--yes=false",
    flag: "--yes",
    value: "false",
    takesValue: false,
  },
  "stray-value": { kind: "stray-value", token: "dry-run" },
  "unicode-dash-flag": { kind: "unicode-dash-flag", token: "\u2013dry-run" },
};

describe("createReleaseFlagSpecFromOptions", () => {
  const OPTIONS = {
    "--version": {
      name: "--version",
      aliases: ["-v"],
      type: "string",
    },
    "--count": { name: "--count", type: "number" },
    "--yes": { name: "--yes", aliases: ["-y"], type: "boolean" },
  } as const;

  it("takes a value only after a non-boolean option, its aliases, or a global option", () => {
    expect(createReleaseFlagSpecFromOptions(OPTIONS).valueFlags).toEqual([
      "--version",
      "-v",
      "--count",
      ...AVA_GLOBAL_FLAGS,
    ]);
  });

  it("accepts every declared option and alias, the help options, and the global options", () => {
    expect(createReleaseFlagSpecFromOptions(OPTIONS).acceptedFlags).toEqual([
      "--version",
      "-v",
      "--count",
      "--yes",
      "-y",
      "--help",
      "-h",
      ...AVA_GLOBAL_FLAGS,
    ]);
  });
});

describe("getReleaseFlagProblemsFromArgv", () => {
  it("accepts every supported option and alias", () => {
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

    expect(_getReleaseFlagProblemsForRelease(argv)).toEqual([]);
  });

  it("accepts the global --env option and its value", () => {
    expect(
      _getReleaseFlagProblemsForRelease(["release", "--env", "staging"]),
    ).toEqual([]);
  });

  it("accepts the value after each value-taking alias", () => {
    expect(
      _getReleaseFlagProblemsForRelease([
        "release",
        "-v",
        "0.15.0",
        "-n",
        "0.15.1",
      ]),
    ).toEqual([]);
  });

  it("accepts the command words before the first option", () => {
    expect(
      getReleaseFlagProblemsFromArgv({
        argv: ["release", "notes", "--update"],
        acceptedFlags: ["--update"],
        valueFlags: [],
      }),
    ).toEqual([]);
  });

  it("catches a mistyped option, which would otherwise be ignored silently", () => {
    expect(_getReleaseFlagProblemsForRelease(["release", "--dryrun"])).toEqual([
      { kind: "unknown-flag", token: "--dryrun" },
    ]);
    expect(
      _getReleaseFlagProblemsForRelease(["release", "--dry_run", "--yes"]),
    ).toEqual([{ kind: "unknown-flag", token: "--dry_run" }]);
  });

  it("reports only the unknown option when a word follows it, as its value", () => {
    expect(
      _getReleaseFlagProblemsForRelease(["release", "--verison", "0.11.0"]),
    ).toEqual([{ kind: "unknown-flag", token: "--verison" }]);
  });

  it("refuses a second word after an unknown option", () => {
    expect(
      _getReleaseFlagProblemsForRelease([
        "release",
        "--verison",
        "0.11.0",
        "extra",
      ]),
    ).toEqual([
      { kind: "unknown-flag", token: "--verison" },
      { kind: "stray-value", token: "extra" },
    ]);
  });

  it("refuses a word after an unknown --option=value token", () => {
    expect(
      _getReleaseFlagProblemsForRelease(["release", "--nope=1", "extra"]),
    ).toEqual([
      { kind: "unknown-flag", token: "--nope=1" },
      { kind: "stray-value", token: "extra" },
    ]);
  });

  it("does not mistake an option value for an option", () => {
    expect(
      _getReleaseFlagProblemsForRelease(["release", "--version", "0.11.0"]),
    ).toEqual([]);
  });

  it("does not read a value containing = as an --option=value token", () => {
    expect(
      _getReleaseFlagProblemsForRelease(["release", "--version", "a=b"]),
    ).toEqual([]);
  });

  it.each(["--yes", "-y", "--dry-run", "--skip-ci-check", "--skip-changelog"])(
    "refuses a bare word after the switch %s, which would become its value",
    (switchFlag) => {
      expect(
        _getReleaseFlagProblemsForRelease(["release", switchFlag, "dry-run"]),
      ).toEqual([{ kind: "stray-value", token: "dry-run" }]);
    },
  );

  it("refuses a bare word after ava release notes --update", () => {
    expect(
      getReleaseFlagProblemsFromArgv({
        argv: ["release", "notes", "--update", "dry-run"],
        acceptedFlags: ["--version", "--update", "--dry-run"],
        valueFlags: ["--version"],
      }),
    ).toEqual([{ kind: "stray-value", token: "dry-run" }]);
  });

  it("refuses a second word after a value-taking option's value", () => {
    expect(
      _getReleaseFlagProblemsForRelease([
        "release",
        "--version",
        "0.15.0",
        "0.15.1",
      ]),
    ).toEqual([{ kind: "stray-value", token: "0.15.1" }]);
  });

  it.each(UNICODE_DASHES)(
    "refuses an option whose dashes became the long dash %s",
    (dash) => {
      const token = `${dash}dry-run`;

      expect(
        _getReleaseFlagProblemsForRelease(["release", "--yes", token]),
      ).toEqual([{ kind: "unicode-dash-flag", token }]);
    },
  );

  it("refuses a long-dash option in place of the first option", () => {
    const token = "\u2013dry-run";

    expect(_getReleaseFlagProblemsForRelease(["release", token])).toEqual([
      { kind: "unicode-dash-flag", token },
    ]);
  });

  it("does not take a long-dash option as a value-taking option's value", () => {
    const token = "\u2014yes";

    expect(
      _getReleaseFlagProblemsForRelease(["release", "--version", token]),
    ).toEqual([{ kind: "unicode-dash-flag", token }]);
  });

  it("refuses --dry-run=true as an inline value even though --dry-run is accepted", () => {
    expect(
      _getReleaseFlagProblemsForRelease(["release", "--dry-run=true", "--yes"]),
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

  it("refuses --yes=false as an inline value of a switch", () => {
    expect(
      _getReleaseFlagProblemsForRelease(["release", "--yes=false"]),
    ).toEqual([
      {
        kind: "inline-value",
        token: "--yes=false",
        flag: "--yes",
        value: "false",
        takesValue: false,
      },
    ]);
  });

  it("refuses --version=1.0.0 as an inline value of a value-taking option", () => {
    expect(
      _getReleaseFlagProblemsForRelease(["release", "--version=1.0.0"]),
    ).toEqual([
      {
        kind: "inline-value",
        token: "--version=1.0.0",
        flag: "--version",
        value: "1.0.0",
        takesValue: true,
      },
    ]);
  });

  it("refuses an unsupported --option=value token whole, as an unknown option", () => {
    expect(_getReleaseFlagProblemsForRelease(["release", "--nope=1"])).toEqual([
      { kind: "unknown-flag", token: "--nope=1" },
    ]);
  });

  it("uses the given acceptedFlags, not the ones ava release takes", () => {
    expect(
      getReleaseFlagProblemsFromArgv({
        argv: ["notes", "--update", "--next", "0.1.1"],
        acceptedFlags: ["--update"],
        valueFlags: [],
      }),
    ).toEqual([{ kind: "unknown-flag", token: "--next" }]);
  });
});

describe("describeReleaseFlagProblems", () => {
  /** The refusal for `problems` when `--version` and `-v` take a value. */
  function _describe(problems: readonly ReleaseFlagProblem[]): string {
    return describeReleaseFlagProblems({
      problems,
      valueFlags: ["--version", "-v"],
    });
  }

  it("names a single unknown option", () => {
    expect(_describe([{ kind: "unknown-flag", token: "--dryrun" }])).toBe(
      "Unknown option: --dryrun.",
    );
  });

  it("names several unknown options in the plural", () => {
    expect(
      _describe([
        { kind: "unknown-flag", token: "--dryrun" },
        { kind: "unknown-flag", token: "--alpha" },
      ]),
    ).toBe("Unknown options: --dryrun, --alpha.");
  });

  it("calls an unknown --option=value token an unknown option", () => {
    expect(_describe([{ kind: "unknown-flag", token: "--nope=1" }])).toBe(
      "Unknown option: --nope=1.",
    );
  });

  it("tells the user a switch given true takes no value", () => {
    expect(
      _describe([
        {
          kind: "inline-value",
          token: "--dry-run=true",
          flag: "--dry-run",
          value: "true",
          takesValue: false,
        },
      ]),
    ).toBe(
      "`--dry-run=true`: `--dry-run` takes no value. Pass it to turn it " +
        "on, or leave it out.",
    );
  });

  it("tells the user to leave out a switch given false, not to pass it", () => {
    expect(
      _describe([
        {
          kind: "inline-value",
          token: "--yes=false",
          flag: "--yes",
          value: "false",
          takesValue: false,
        },
      ]),
    ).toBe(
      "`--yes=false`: `--yes` takes no value. Pass it to turn it on, or " +
        "leave it out.",
    );
  });

  it("tells the user to write a value-taking option and its value as two words", () => {
    expect(
      _describe([
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

  it("names a stray word and the command's options that take a value", () => {
    expect(_describe([{ kind: "stray-value", token: "dry-run" }])).toBe(
      "Unexpected word: dry-run. An option starts with `--`, and only " +
        "these options take a value: `--version`, `-v`.",
    );
  });

  it("names a stray word in a command with no option that takes a value", () => {
    expect(
      describeReleaseFlagProblems({
        problems: [{ kind: "stray-value", token: "dry-run" }],
        valueFlags: [],
      }),
    ).toBe(
      "Unexpected word: dry-run. An option starts with `--`, and no " +
        "option here takes a value.",
    );
  });

  it("tells the user to retype a long-dash option with plain hyphens", () => {
    const token = "\u2013dry-run";

    expect(_describe([{ kind: "unicode-dash-flag", token }])).toBe(
      `Retype the dashes as plain hyphens (-): ${token}.`,
    );
  });

  it.each(Object.values(PROBLEM_OF_EACH_KIND))(
    "never describes a $kind problem with an empty message",
    (problem) => {
      expect(_describe([problem])).not.toBe("");
    },
  );

  it("reports each kind of problem in its own sentence", () => {
    expect(
      _describe([
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
      [
        "Unknown option: --dryrun.",
        "Unexpected word: yes. An option starts with `--`, and only these",
        "options take a value: `--version`, `-v`.",
        "Write `--version 1.0.0`, not `--version=1.0.0`.",
      ].join(" "),
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
  it("detects both help options", () => {
    expect(wantsHelp(["release", "--help"])).toBe(true);
    expect(wantsHelp(["release", "-h"])).toBe(true);
  });

  it("is false for a real release", () => {
    expect(wantsHelp(["release", "--version", "0.11.0"])).toBe(false);
  });
});
