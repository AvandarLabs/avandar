import { Acclimate } from "@avandar/acclimate";
import { printError, printInfo, printSuccess } from "../../../utils/cliOutput";
import { sendNgrokURLManagerRequest } from "../sendNgrokURLManagerRequest";
import type { NgrokDevURLTarget } from "../sendNgrokURLManagerRequest";

function _formatTimestampForDisplay(isoTimestamp: string): string {
  return new Date(isoTimestamp).toUTCString();
}

function _formatLastAccessedForDisplay(value: string | null): string {
  if (value === null) {
    return "Never";
  }

  return _formatTimestampForDisplay(value);
}

/**
 * List all registered dev ngrok URLs.
 *
 * This is separated from the CLI wiring so it can be unit-tested.
 */
export async function runNgrokURLList(): Promise<void> {
  try {
    printInfo("Fetching registered ngrok URLs...");
    const { targets } = await sendNgrokURLManagerRequest({
      path: "/ngrok-url/list",
      method: "GET",
    });

    if (targets.length === 0) {
      printSuccess("No registered ngrok URLs.");
      return;
    }

    printSuccess("Registered ngrok URLs:");
    targets.forEach((target: NgrokDevURLTarget) => {
      const dateAdded: string = _formatTimestampForDisplay(target.dateAdded);
      const lastAccessed: string = _formatLastAccessedForDisplay(
        target.lastAccessedDate,
      );

      const line: string =
        `${target.url} (added: ${dateAdded}, ` +
        `last accessed: ${lastAccessed})`;
      Acclimate.log(line);
    });
  } catch (error: unknown) {
    const message: string =
      error instanceof Error ? error.message : String(error);
    printError("Failed to list ngrok URLs.");
    printError(message);
    throw error;
  }
}

/** List all registered dev ngrok URLs. */
export const NgrokURLListCLI = Acclimate.createCLI("list")
  .description("List all registered dev ngrok URLs.")
  .action(runNgrokURLList);
