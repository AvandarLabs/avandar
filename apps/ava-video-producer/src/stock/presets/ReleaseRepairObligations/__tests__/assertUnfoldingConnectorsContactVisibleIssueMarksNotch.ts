import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../tests/helpers/SvgAttributes";

/**
 * Asserts unfolding connectors contact the visible mark boundary before
 * routing outside the artifact.
 */
export function assertUnfoldingConnectorsContactVisibleIssueMarksNotch({
  issueMarks,
  start,
  mark,
}: Readonly<{
  issueMarks: string;
  start: RegExpMatchArray;
  mark: RegExpExecArray[number];
}>): void {
  if (issueMarks === "tabs") {
    assert.equal(
      Number(start[1]),
      SvgAttributes.getNumberFromMarkup({ attributes: mark, name: "x" }),
    );
    assert.equal(
      Number(start[2]),
      SvgAttributes.getNumberFromMarkup({ attributes: mark, name: "y" }) +
        SvgAttributes.getNumberFromMarkup({
          attributes: mark,
          name: "height",
        }) /
          2,
    );
  } else {
    const notch = mark.match(/ d="M([^ ]+) ([^ ]+)/);
    assert.ok(notch);
    assert.equal(Number(start[1]), Number(notch[1]));
    assert.equal(Number(start[2]), Number(notch[2]));
  }
}
