import { validateReleaseVersion } from "@ava-cli/ReleaseCLI/releaseVersions";
import { printError } from "@ava-cli/utils/cliOutput/cliOutput";
import { Acclimate } from "@avandar/acclimate";

/**
 * The interactive half of `ava release`.
 *
 * Prompting happens here, inside the command, rather than through Acclimate's
 * `askIfEmpty`. `askIfEmpty` runs during argument parsing, before the action is
 * ever called, so a prompt raised that way cannot mention the current version
 * or the suggested next one: the command has not looked at the repository yet.
 * Since the whole point is to answer "which version?" while looking at the
 * versions that exist, the reference block is printed first and the prompts are
 * raised afterwards.
 */

/** Refuses rather than hangs when there is no one there to answer. */
function assertInteractive(what: string): void {
  if (process.stdin.isTTY !== true) {
    throw new Error(
      `${what} was not provided and there is no terminal to ask on. ` +
        "Pass it as an option instead.",
    );
  }
}

/**
 * Asks for a version until the answer is a valid one.
 *
 * Validation loops instead of aborting: the user is already sitting at the
 * prompt, and losing a half-finished release to a typo would be absurd.
 */
export async function promptForVersion(options: {
  message: string;
  defaultValue: string | undefined;
  label: string;
}): Promise<string> {
  const { message, defaultValue, label } = options;
  assertInteractive(label);

  while (true) {
    const answer = await Acclimate.requestInput({
      message: `|bright_cyan|${message}|reset|`,
      params: {},
      responseOptions: {
        required: true,
        type: "string",
        ...(defaultValue !== undefined ? { defaultValue } : {}),
      },
    });

    const trimmed = (answer ?? "").trim();
    const validation = validateReleaseVersion(trimmed, label);
    if (validation.valid) {
      return trimmed;
    }
    printError(validation.message);
  }
}

/**
 * Asks a yes/no question. Returns the answer; `--yes` never reaches here.
 */
export async function promptToConfirm(message: string): Promise<boolean> {
  assertInteractive("A confirmation");

  const answer = await Acclimate.requestInput({
    message: `|bright_cyan|${message}|reset|`,
    params: {},
    responseOptions: { required: true, type: "boolean" },
  });
  return answer === "true";
}
