/**
 * Flag handling that Acclimate does not do for us.
 *
 * Acclimate prints help only for a CLI that has no action, and it ignores any
 * option it does not recognise. For most commands that is harmless. For a
 * command that pushes tags and deploys production it is not: `ava release
 * --help` would start a release, and a typo such as `--dryrun` would be dropped
 * silently, turning an intended rehearsal into the real thing. Both are handled
 * here instead.
 *
 * Acclimate also reads `--dry-run=true` as one unknown option named
 * `--dry-run=true`, and it joins every word after a flag into that flag's
 * value, so `--yes dry-run` sets `yes` and leaves `--dry-run` false. In both
 * cases a rehearsal becomes a real release. Only the exact flag spelling is
 * accepted, and a word may follow only a flag that takes a value.
 */

/**
 * The global options the root `ava` CLI declares, which Acclimate hands to
 * every command. A release command's accepted flags include these, so for
 * example `ava release notes --env staging` is not refused. Each one takes a
 * value. Keep in sync with the root CLI's addGlobalOption calls.
 */
export const AVA_GLOBAL_FLAGS = ["--env"] as const;

/** Every flag `ava release` accepts, including aliases. */
export const RELEASE_FLAGS = [
  "--version",
  "-v",
  "--next",
  "-n",
  "--yes",
  "-y",
  "--dry-run",
  "--skip-ci-check",
  "--skip-changelog",
  "--help",
  "-h",
  ...AVA_GLOBAL_FLAGS,
] as const;

/** The flags `ava release` accepts that take a value, including aliases. */
export const RELEASE_VALUE_FLAGS = [
  "--version",
  "-v",
  "--next",
  "-n",
  ...AVA_GLOBAL_FLAGS,
] as const;

/**
 * One argv token a release command refuses, found by
 * {@link findUnknownReleaseFlags} and explained by
 * {@link describeUnknownReleaseFlags}.
 *
 * - `unknown-flag`: starts with `-` but is not an accepted flag, such as
 *   `--dryrun` or `--nope=1`.
 * - `inline-value`: an accepted `flag` written with `=value` attached, such as
 *   `--dry-run=true`. `takesValue` says whether the flag takes a value.
 * - `stray-value`: a word that is neither a command word nor the value of a
 *   flag that takes one, such as the `dry-run` in `--yes dry-run`.
 * - `unicode-dash-flag`: starts with an en dash, em dash, or minus sign, as a
 *   pasted flag does once an editor autocorrects its hyphens.
 */
export type ReleaseFlagProblem =
  | { kind: "unknown-flag"; token: string }
  | {
      kind: "inline-value";
      token: string;
      flag: string;
      value: string;
      takesValue: boolean;
    }
  | { kind: "stray-value"; token: string }
  | { kind: "unicode-dash-flag"; token: string };

/** The accepted spellings a release command checks argv against. */
type ReleaseFlagSpec = {
  acceptedFlags: readonly string[];
  valueFlags: readonly string[];
};

/** An en dash, em dash, or minus sign at the start of a token. */
const UNICODE_DASH_PATTERN = /^[\u2013\u2014\u2212]/;

/** The problem with a token that starts with `-`, if it has one. */
function _getProblemFromFlagToken(
  token: string,
  spec: Readonly<ReleaseFlagSpec>,
): ReleaseFlagProblem | undefined {
  const equalsIndex = token.indexOf("=");
  if (equalsIndex === -1) {
    return spec.acceptedFlags.includes(token)
      ? undefined
      : { kind: "unknown-flag", token };
  }
  const flag = token.slice(0, equalsIndex);
  if (!spec.acceptedFlags.includes(flag)) {
    return { kind: "unknown-flag", token };
  }
  return {
    kind: "inline-value",
    token,
    flag,
    value: token.slice(equalsIndex + 1),
    takesValue: spec.valueFlags.includes(flag),
  };
}

/**
 * Tokens in `argv` that a release command must refuse before it changes
 * anything, in argv order. Empty when every token is safe to hand Acclimate.
 *
 * The words before the first flag are command words, such as `release
 * notes`. After that, a word is allowed only as the one value directly after
 * a flag in `valueFlags`, such as the `0.11.0` in `--version 0.11.0`.
 */
export function findUnknownReleaseFlags(
  options: Readonly<{
    argv: readonly string[];
    acceptedFlags: readonly string[];
    valueFlags: readonly string[];
  }>,
): ReleaseFlagProblem[] {
  const { argv, ...spec } = options;
  const problems: ReleaseFlagProblem[] = [];
  let isPastCommandWords = false;
  let isValueExpected = false;

  argv.forEach((token) => {
    if (UNICODE_DASH_PATTERN.test(token)) {
      problems.push({ kind: "unicode-dash-flag", token });
      isPastCommandWords = true;
      isValueExpected = false;
      return;
    }
    if (token.startsWith("-")) {
      const problem = _getProblemFromFlagToken(token, spec);
      if (problem !== undefined) {
        problems.push(problem);
      }
      isPastCommandWords = true;
      isValueExpected = spec.valueFlags.includes(token);
      return;
    }
    if (isPastCommandWords && !isValueExpected) {
      problems.push({ kind: "stray-value", token });
    }
    isValueExpected = false;
  });
  return problems;
}

/** `Label: a, b.`, with an `s` on the label when there are several tokens. */
function _buildTokenListSentence(
  label: string,
  tokens: readonly string[],
): string | undefined {
  if (tokens.length === 0) {
    return undefined;
  }
  return `${label}${tokens.length > 1 ? "s" : ""}: ${tokens.join(", ")}.`;
}

/** The sentence telling the user how to rewrite one `--flag=value` token. */
function _buildInlineValueSentence(
  problem: Extract<ReleaseFlagProblem, { kind: "inline-value" }>,
): string {
  return problem.takesValue
    ? `Write \`${problem.flag} ${problem.value}\`, not \`${problem.token}\`.`
    : `Pass \`${problem.flag}\` on its own, not \`${problem.token}\`.`;
}

/** The tokens of every problem of one kind. */
function _getTokensOfKind(
  problems: readonly ReleaseFlagProblem[],
  kind: ReleaseFlagProblem["kind"],
): string[] {
  return problems
    .filter((problem) => {
      return problem.kind === kind;
    })
    .map((problem) => {
      return problem.token;
    });
}

/**
 * The refusal message for the problems {@link findUnknownReleaseFlags} found,
 * one sentence per kind of problem. A release command prints it, then says
 * what it did not do.
 */
export function describeUnknownReleaseFlags(
  problems: readonly ReleaseFlagProblem[],
): string {
  const strayValueSentence = _buildTokenListSentence(
    "Unexpected word",
    _getTokensOfKind(problems, "stray-value"),
  );
  const inlineValueSentences = problems.flatMap((problem) => {
    return problem.kind === "inline-value"
      ? [_buildInlineValueSentence(problem)]
      : [];
  });

  return [
    _buildTokenListSentence(
      "Unknown option",
      _getTokensOfKind(problems, "unknown-flag"),
    ),
    _buildTokenListSentence(
      "Retype the dashes as plain hyphens (-)",
      _getTokensOfKind(problems, "unicode-dash-flag"),
    ),
    strayValueSentence === undefined
      ? undefined
      : `${strayValueSentence} A flag starts with \`--\`, and only an ` +
        "option such as `--version` takes a value.",
    ...inlineValueSentences,
  ]
    .filter((sentence) => {
      return sentence !== undefined;
    })
    .join(" ");
}

/** Whether the user asked for help rather than a release. */
export function wantsHelp(argv: readonly string[]): boolean {
  return argv.includes("--help") || argv.includes("-h");
}
