import { type Input } from "../ReleaseRepairObligations.schema";
import { assertUnfoldingConnectorsContactVisiblePath as _assertUnfoldingConnectorsContactVisiblePath } from "./assertUnfoldingConnectorsContactVisiblePath";
import { type AssertUnfoldingConnectorsContactVisibleFrameOptions } from "./ReleaseRepairObligationsContractTestState.types";
import { render } from "./ReleaseRepairObligationsTestHelpers";

/**
 * Asserts unfolding connectors contact the visible mark boundary before
 * routing outside the artifact.
 */
export function assertUnfoldingConnectorsContactVisibleFrame({
  frame,
  input,
  issueMarks,
  showResolvedIssues,
}: Readonly<AssertUnfoldingConnectorsContactVisibleFrameOptions>): void {
  const configured: Input = {
    ...input,
    issueMarks: issueMarks as Input["issueMarks"],
    showResolvedIssues,
  };
  const markup = render({ frame: frame, input: configured });
  const connectors = [
    ...markup.matchAll(/<path data-obligation-unfold="([^"]*)"[^>]*>/g),
  ];
  connectors.forEach(([path, id]) => {
    return _assertUnfoldingConnectorsContactVisiblePath({
      path,
      id,
      markup,
      issueMarks,
    });
  });
}
