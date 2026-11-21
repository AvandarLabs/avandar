import { type Input } from "../ReleaseRepairObligations.schema";
import { assertUnfoldingConnectorsContactVisibleShowResolvedIssues as _assertUnfoldingConnectorsContactVisibleShowResolvedIssues } from "./assertUnfoldingConnectorsContactVisibleShowResolvedIssues";

/** Asserts the independently authored rendered test contract. */
export function assertUnfoldingConnectorsContactVisibleIssueMarks({
  issueMarks,
  input,
}: Readonly<{ issueMarks: string; input: Readonly<Input> }>): void {
  return [true, false].forEach((showResolvedIssues) => {
    return _assertUnfoldingConnectorsContactVisibleShowResolvedIssues({
      showResolvedIssues,
      input,
      issueMarks,
    });
  });
}
