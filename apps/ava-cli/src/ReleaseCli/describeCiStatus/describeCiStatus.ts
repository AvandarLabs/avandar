import type { CiStatus } from "@ava-cli/ReleaseCli/checkSourceBranchCi/checkSourceBranchCi";
import type { ReleaseLine } from "@ava-cli/ReleaseCli/getReleaseLineFromBranch/getReleaseLineFromBranch";

/**
 * How the line's source-branch CI is named, at the start of a sentence and
 * inside one.
 */
const CI_NAME_BY_LINE_KIND: Readonly<
  Record<ReleaseLine["kind"], Readonly<{ leading: string; inline: string }>>
> = {
  mainline: { leading: "Staging CI", inline: "staging CI" },
};

/**
 * A one-line description of the source branch's CI verdict, ready to print,
 * naming whose CI it is (`staging` on mainline).
 *
 * Every case names the verdict plus the run URL where one exists, so a reviewer
 * deciding whether to release anyway can open the run without hunting for it.
 */
export function describeCiStatus(
  options: Readonly<{ status: CiStatus; line: ReleaseLine }>,
): string {
  const { status, line } = options;
  const { leading, inline } = CI_NAME_BY_LINE_KIND[line.kind];
  switch (status.kind) {
    case "passed":
      return `${leading} passed.`;
    case "failed":
      return `${leading} did not pass (${status.conclusion}): ${status.url}`;
    case "pending":
      return `${leading} has not finished (${status.status}): ${status.url}`;
    case "missing":
      return `No ${inline} run was found for this commit.`;
    case "unknown":
      return `Could not check ${inline}: ${status.reason}`;
  }
}
