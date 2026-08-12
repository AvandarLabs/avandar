/**
 * Flag handling that Acclimate does not do for us.
 *
 * Acclimate prints help only for a CLI that has no action, and it ignores any
 * option it does not recognise. For most commands that is harmless. For a
 * command that pushes tags and deploys production it is not: `ava release
 * --help` would start a release, and a typo such as `--dryrun` would be dropped
 * silently, turning an intended rehearsal into the real thing. Both are handled
 * here instead.
 */

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
  "--help",
  "-h",
] as const;

/**
 * Flags in `argv` that `ava release` does not accept.
 *
 * Values are skipped because they do not start with `-`, e.g. the `0.11.0` in
 * `--version 0.11.0`.
 */
export function findUnknownReleaseFlags(
  argv: readonly string[],
): readonly string[] {
  const known: readonly string[] = RELEASE_FLAGS;

  return argv.filter((token) => {
    if (!token.startsWith("-")) {
      return false;
    }
    // `--flag=value` is not Acclimate's syntax, but reject the flag part rather
    // than the whole token so the message names something recognisable.
    const [flag] = token.split("=");
    return !known.includes(flag ?? token);
  });
}

/** Whether the user asked for help rather than a release. */
export function wantsHelp(argv: readonly string[]): boolean {
  return argv.includes("--help") || argv.includes("-h");
}
