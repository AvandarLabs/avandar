import { findRepoRoot } from "@ava-cli/utils/findRepoRoot";

const KEBAB_CASE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * True when `value` is lowercase words joined by single hyphens, the form of
 * a plugin folder name and of a plugin id's publisher, for example
 * `case-tools`. Use it before joining a value onto `plugins/` or a command.
 */
export function isKebabCaseName(value: string): boolean {
  return KEBAB_CASE_PATTERN.test(value);
}

/**
 * Gets the Avandar repository root a plugin command works in: `repoRoot` when
 * given, otherwise the repository containing the working directory. Throws
 * when the command was started outside the repository.
 */
export function getRepoRootOrThrow(repoRoot?: string): string {
  const foundRepoRoot = repoRoot ?? findRepoRoot();
  if (foundRepoRoot === undefined) {
    throw new Error(
      "This command must run inside the Avandar repository. " +
        "Change into a repository checkout and run it again.",
    );
  }
  return foundRepoRoot;
}

/**
 * True when both stdin and stdout are a terminal, so a prompt can be shown
 * and answered. A command prompts only then, and fails with the exact
 * invocation to try when it is false, so a script never waits on input.
 */
export function hasInteractiveTerminal(): boolean {
  return process.stdin.isTTY === true && process.stdout.isTTY === true;
}
