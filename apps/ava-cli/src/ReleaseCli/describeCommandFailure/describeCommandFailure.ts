import type { CommandResult } from "@ava-cli/ReleaseCli/createReleaseCommands";

/**
 * A one-line description of why a command failed, for embedding in a message
 * shown to the reviewer.
 *
 * Returns the first line of the command's stderr, or `fallback` when it failed
 * without printing anything (a missing executable, for instance).
 */
export function describeCommandFailure(
  result: Readonly<CommandResult>,
  fallback: string,
): string {
  // Only the first line: stderr from `gh` and `git` often carries a hint block
  // underneath, which turns one refusal into a wall of text.
  const firstLine = result.stderr.split("\n")[0];
  return firstLine !== undefined && firstLine.length > 0 ? firstLine : fallback;
}
