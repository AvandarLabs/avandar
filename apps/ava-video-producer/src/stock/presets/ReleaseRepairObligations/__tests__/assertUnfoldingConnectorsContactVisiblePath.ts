import assert from "node:assert/strict";
import { assertUnfoldingConnectorsContactVisibleIssueMarksNotch as _assertUnfoldingConnectorsContactVisibleIssueMarksNotch } from "./assertUnfoldingConnectorsContactVisibleIssueMarksNotch";
import { type AssertUnfoldingConnectorsContactVisiblePathOptions } from "./ReleaseRepairObligationsContractTestState.types";

/**
 * Asserts unfolding connectors contact the visible mark boundary before
 * routing outside the artifact.
 */
export function assertUnfoldingConnectorsContactVisiblePath({
  path,
  id,
  markup,
  issueMarks,
}: Readonly<AssertUnfoldingConnectorsContactVisiblePathOptions>): void {
  const mark = [
    ...markup.matchAll(
      new RegExp(
        `<[^>]*data-${issueMarks === "tabs" ? "issue-tab" : "issue-notch"}="([^"]*)"[^>]*>`,
        "g",
      ),
    ),
  ].find((match) => {
    return match[1] === id;
  })?.[0];
  assert.ok(mark);
  const start = path.match(/ d="M([^ ]+) ([^ ]+)/);
  assert.ok(start);
  _assertUnfoldingConnectorsContactVisibleIssueMarksNotch({
    issueMarks,
    start,
    mark,
  });
}
