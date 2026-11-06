import type { Input } from "./ReleaseRepairObligations.schema";
/**
 * The visible artifact rows preserve original issue keys when resolved rows
 * hide.
 */
export function getVisibleReleaseIssueRowsFromInput(
  input: Readonly<Input>,
): Array<{ issue: Input["issues"][number]; y: number; ordinal: number }> {
  return input.issues
    .filter((issue) => issue.state === "open" || input.showResolvedIssues)
    .map((issue, index) => ({
      issue,
      y: 212 + index * 48,
      ordinal: input.issues.indexOf(issue) + 1,
    }));
}
