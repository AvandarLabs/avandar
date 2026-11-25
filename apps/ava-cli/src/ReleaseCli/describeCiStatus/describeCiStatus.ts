import type { CiStatus } from "@ava-cli/ReleaseCli/checkSourceBranchCi/checkSourceBranchCi";

/** The source branch's CI, named at the start of a sentence. */
const LEADING_CI_NAME = "Staging CI";

/** The source branch's CI, named inside a sentence. */
const INLINE_CI_NAME = "staging CI";

/**
 * A one-line description of the source branch's CI verdict, ready to print.
 *
 * Every case names the verdict plus the run URL where one exists, so a reviewer
 * deciding whether to release anyway can open the run without hunting for it.
 */
export function describeCiStatus(status: CiStatus): string {
  switch (status.kind) {
    case "passed":
      return `${LEADING_CI_NAME} passed.`;
    case "failed":
      return `${LEADING_CI_NAME} did not pass (${status.conclusion}): ${status.url}`;
    case "pending":
      return `${LEADING_CI_NAME} has not finished (${status.status}): ${status.url}`;
    case "missing":
      return `No ${INLINE_CI_NAME} run was found for this commit.`;
    case "unknown":
      return `Could not check ${INLINE_CI_NAME}: ${status.reason}`;
  }
}
