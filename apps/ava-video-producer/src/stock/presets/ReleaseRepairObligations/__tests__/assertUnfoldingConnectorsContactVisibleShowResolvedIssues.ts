import { type Input } from "../ReleaseRepairObligations.schema";
import { assertUnfoldingConnectorsContactVisibleFrame as _assertUnfoldingConnectorsContactVisibleFrame } from "./assertUnfoldingConnectorsContactVisibleFrame";

/**
 * Asserts unfolding connectors contact the visible mark boundary before
 * routing outside the artifact.
 */
export function assertUnfoldingConnectorsContactVisibleShowResolvedIssues({
  showResolvedIssues,
  input,
  issueMarks,
}: Readonly<{
  showResolvedIssues: boolean;
  input: Readonly<Input>;
  issueMarks: string;
}>): void {
  return [50, 65, 80, 89].forEach((frame) => {
    return _assertUnfoldingConnectorsContactVisibleFrame({
      frame,
      input,
      issueMarks,
      showResolvedIssues,
    });
  });
}
