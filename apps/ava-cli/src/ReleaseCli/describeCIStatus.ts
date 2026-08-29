import type { CIStatus } from "@ava-cli/ReleaseCli/checkDevelopCI";

/**
 * A one-line description of a staging CI verdict, ready to print.
 *
 * Every case names the verdict plus the run URL where one exists, so a reviewer
 * deciding whether to release anyway can open the run without hunting for it.
 */
export function describeCIStatus(status: CIStatus): string {
  switch (status.kind) {
    case "passed":
      return "Staging CI passed.";
    case "failed":
      return `Staging CI did not pass (${status.conclusion}): ${status.url}`;
    case "pending":
      return `Staging CI has not finished (${status.status}): ${status.url}`;
    case "missing":
      return "No staging CI run was found for this commit.";
    case "unknown":
      return `Could not check staging CI: ${status.reason}`;
  }
}
