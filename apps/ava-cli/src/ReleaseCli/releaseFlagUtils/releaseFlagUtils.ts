import { objectKeys } from "@avandar/utils";

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

/**
 * One argv token a release command refuses, found by
 * {@link getReleaseFlagProblemsFromArgv} and explained by
 * {@link describeReleaseFlagProblems}.
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
export type ReleaseFlagSpec = {
  acceptedFlags: readonly string[];
  valueFlags: readonly string[];
};

/** One option as an Acclimate CLI declares it in `state.optionArgs`. */
type ReleaseOptionDeclaration = Readonly<{
  name: string;
  type: string;
  aliases?: readonly string[];
}>;

/**
 * The spellings a release command accepts, derived from the options it
 * declares to Acclimate, such as `ReleaseCli.state.optionArgs`. A boolean
 * option is a switch and takes no value. Every other option, its aliases, and
 * each of {@link AVA_GLOBAL_FLAGS} takes one.
 */
export function createReleaseFlagSpecFromOptions(
  optionArgs: Readonly<Record<string, ReleaseOptionDeclaration>>,
): ReleaseFlagSpec {
  const options = Object.values(optionArgs);
  const toSpellings = (option: ReleaseOptionDeclaration): string[] => {
    return [option.name, ...(option.aliases ?? [])];
  };
  return {
    acceptedFlags: [
      ...options.flatMap(toSpellings),
      "--help",
      "-h",
      ...AVA_GLOBAL_FLAGS,
    ],
    valueFlags: [
      ...options
        .filter((option) => {
          return option.type !== "boolean";
        })
        .flatMap(toSpellings),
      ...AVA_GLOBAL_FLAGS,
    ],
  };
}

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
 * Whether the word after `token` is that option's value: it is when `token`
 * takes a value, and when it is an unknown `--option` with no `=`, since
 * Acclimate would read the word as its value too. Reading it that way leaves
 * a mistyped `--verison 0.11.0` with one error, not two.
 */
function _isValueExpectedAfter(
  token: string,
  problem: ReleaseFlagProblem | undefined,
  spec: Readonly<ReleaseFlagSpec>,
): boolean {
  if (problem?.kind === "unknown-flag") {
    return !token.includes("=");
  }
  return spec.valueFlags.includes(token);
}

/**
 * Tokens in `argv` that a release command must refuse before it changes
 * anything, in argv order. Empty when every token is safe to hand Acclimate.
 *
 * The words before the first option are command words, such as `release
 * notes`. After that, a word is allowed only as the one value directly after
 * an option in `valueFlags`, such as the `0.11.0` in `--version 0.11.0`, or
 * after an unknown option, which is refused on its own.
 */
export function getReleaseFlagProblemsFromArgv(
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
      isValueExpected = _isValueExpectedAfter(token, problem, spec);
      return;
    }
    if (isPastCommandWords && !isValueExpected) {
      problems.push({ kind: "stray-value", token });
    }
    isValueExpected = false;
  });
  return problems;
}

/** The problems of one kind, as a sentence builder receives them. */
type ReleaseFlagProblemsOfKind<TKind extends ReleaseFlagProblem["kind"]> =
  ReadonlyArray<Extract<ReleaseFlagProblem, { kind: TKind }>>;

/** `Label: a, b.`, with an `s` on the label when there are several problems. */
function _buildTokenListSentence(
  label: string,
  problems: readonly ReleaseFlagProblem[],
): string {
  const tokens = problems.map((problem) => {
    return problem.token;
  });
  return `${label}${tokens.length > 1 ? "s" : ""}: ${tokens.join(", ")}.`;
}

/** The sentence telling the user how to rewrite one `--option=value` token. */
function _buildInlineValueSentence(
  problem: Extract<ReleaseFlagProblem, { kind: "inline-value" }>,
): string {
  const { flag, token, value } = problem;
  return problem.takesValue
    ? `Write \`${flag} ${value}\`, not \`${token}\`.`
    : [
        `\`${token}\`: \`${flag}\` takes no value.`,
        "Pass it to turn it on, or leave it out.",
      ].join(" ");
}

/** The sentence naming stray words and the options that do take a value. */
function _buildStrayValueSentence(
  problems: ReleaseFlagProblemsOfKind<"stray-value">,
  valueFlags: readonly string[],
): string {
  const valueFlagList = valueFlags
    .map((flag) => {
      return `\`${flag}\``;
    })
    .join(", ");
  const valueFlagClause =
    valueFlags.length === 0
      ? "no option here takes a value"
      : `only these options take a value: ${valueFlagList}`;
  return [
    _buildTokenListSentence("Unexpected word", problems),
    `An option starts with \`--\`, and ${valueFlagClause}.`,
  ].join(" ");
}

/**
 * How {@link describeReleaseFlagProblems} words each kind of problem, in the
 * order its sentences appear. Keyed by every kind, so a new kind fails to
 * compile until it has a sentence.
 */
const RELEASE_FLAG_SENTENCE_BUILDERS: {
  [TKind in ReleaseFlagProblem["kind"]]: (
    problems: ReleaseFlagProblemsOfKind<TKind>,
    valueFlags: readonly string[],
  ) => string;
} = {
  "unknown-flag": (problems) => {
    return _buildTokenListSentence("Unknown option", problems);
  },
  "unicode-dash-flag": (problems) => {
    return _buildTokenListSentence(
      "Retype the dashes as plain hyphens (-)",
      problems,
    );
  },
  "stray-value": _buildStrayValueSentence,
  "inline-value": (problems) => {
    return problems.map(_buildInlineValueSentence).join(" ");
  },
};

/** The sentence for one kind of problem, or undefined if there are none. */
function _buildSentenceForKind<TKind extends ReleaseFlagProblem["kind"]>(
  kind: TKind,
  options: Readonly<{
    problems: readonly ReleaseFlagProblem[];
    valueFlags: readonly string[];
  }>,
): string | undefined {
  const problemsOfKind = options.problems.filter(
    (problem): problem is Extract<ReleaseFlagProblem, { kind: TKind }> => {
      return problem.kind === kind;
    },
  );
  return problemsOfKind.length === 0
    ? undefined
    : RELEASE_FLAG_SENTENCE_BUILDERS[kind](problemsOfKind, options.valueFlags);
}

/**
 * The refusal message for the problems {@link getReleaseFlagProblemsFromArgv}
 * found, one sentence per kind of problem. `valueFlags` are the command's
 * options that take a value, named when a stray word is refused. A release
 * command prints it, then says what it did not do.
 */
export function describeReleaseFlagProblems(
  options: Readonly<{
    problems: readonly ReleaseFlagProblem[];
    valueFlags: readonly string[];
  }>,
): string {
  return objectKeys(RELEASE_FLAG_SENTENCE_BUILDERS)
    .flatMap((kind) => {
      return _buildSentenceForKind(kind, options) ?? [];
    })
    .join(" ");
}

/** Whether the user asked for help rather than a release. */
export function wantsHelp(argv: readonly string[]): boolean {
  return argv.includes("--help") || argv.includes("-h");
}
