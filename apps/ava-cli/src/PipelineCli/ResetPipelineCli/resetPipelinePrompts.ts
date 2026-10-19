import { printError } from "@ava-cli/utils/cliOutput/cliOutput";
import { Acclimate } from "@avandar/acclimate";

/**
 * What to do with catalog listings that a workspace has already added as a
 * dataset: leave them in place, or delete them along with those datasets.
 */
export type InUseListingsChoice = "keep" | "delete";

/** The menu answer that selects each choice. */
const CHOICE_FROM_ANSWER = {
  "1": "keep",
  "2": "delete",
} as const satisfies Record<string, InUseListingsChoice>;

/** Refuses rather than hangs when there is no one there to answer. */
function _assertInteractive(): void {
  if (process.stdin.isTTY !== true) {
    throw new Error(
      "Resetting a pipeline asks for confirmation, and there is no terminal " +
        "to ask on. Run it from an interactive shell.",
    );
  }
}

/** Asks a yes/no question about the reset. Resolves to the answer. */
export async function promptToConfirmReset(message: string): Promise<boolean> {
  _assertInteractive();
  const answer = await Acclimate.requestInput({
    message: `|bright_cyan|${message}|reset|`,
    params: {},
    responseOptions: { required: true, type: "boolean" },
  });
  return answer === "true";
}

/**
 * Asks what to do with listings that workspaces use, until the answer is one
 * of the menu's numbers. Defaults to keeping them, the choice that loses
 * nothing.
 */
export async function promptForInUseListingsChoice(
  message: string,
): Promise<InUseListingsChoice> {
  _assertInteractive();
  const answer = await Acclimate.requestInput({
    message:
      `|bright_cyan|${message}|reset|\n` +
      "  1) Leave only those listings untouched\n" +
      "  2) Delete them all anyway, with their workspace datasets\n",
    params: {},
    responseOptions: { required: true, type: "string", defaultValue: "1" },
  });
  const choice =
    CHOICE_FROM_ANSWER[(answer ?? "").trim() as keyof typeof CHOICE_FROM_ANSWER];
  if (choice !== undefined) {
    return choice;
  }
  printError("Answer 1 or 2.");
  return promptForInUseListingsChoice(message);
}
