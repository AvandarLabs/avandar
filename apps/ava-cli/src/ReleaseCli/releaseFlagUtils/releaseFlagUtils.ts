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
 * `--dry-run=true`, so `--dry-run` keeps its default of false and a rehearsal
 * becomes a real release. Only the exact flag spelling is accepted.
 */

/**
 * The global options the root `ava` CLI declares, which Acclimate hands to
 * every command. A release command's accepted flags include these, so for
 * example `ava release notes --env staging` is not refused.
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

/**
 * Flags in `argv` that are not exactly one of `acceptedFlags`, for a release
 * command to refuse before it changes anything. A `--flag=value` token is
 * always refused, even when `--flag` is accepted.
 *
 * Values are skipped because they do not start with `-`, e.g. the `0.11.0` in
 * `--version 0.11.0`.
 */
export function findUnknownReleaseFlags(
  options: Readonly<{
    argv: readonly string[];
    acceptedFlags: readonly string[];
  }>,
): string[] {
  const { argv, acceptedFlags } = options;

  return argv.filter((token) => {
    return token.startsWith("-") && !acceptedFlags.includes(token);
  });
}

/**
 * The refusal message for flags {@link findUnknownReleaseFlags} found, naming
 * a mistyped flag as unknown and telling the user to write a `--flag=value`
 * token as two words. A release command prints it, then says what it did not
 * do.
 */
export function describeUnknownReleaseFlags(
  unknownFlags: readonly string[],
): string {
  const inlineValueFlags = unknownFlags.filter((flag) => {
    return flag.includes("=");
  });
  const unrecognisedFlags = unknownFlags.filter((flag) => {
    return !flag.includes("=");
  });
  const unrecognisedSentence =
    unrecognisedFlags.length > 0
      ? `Unknown option${unrecognisedFlags.length > 1 ? "s" : ""}: ` +
        `${unrecognisedFlags.join(", ")}.`
      : undefined;
  const inlineValueSentence =
    inlineValueFlags.length > 0
      ? 'Use "--flag value", not "--flag=value": ' +
        `${inlineValueFlags.join(", ")}.`
      : undefined;

  return [unrecognisedSentence, inlineValueSentence]
    .filter((sentence) => {
      return sentence !== undefined;
    })
    .join(" ");
}

/** Whether the user asked for help rather than a release. */
export function wantsHelp(argv: readonly string[]): boolean {
  return argv.includes("--help") || argv.includes("-h");
}
