import { PeerContributionRecognitionTestState } from "./PeerContributionRecognitionTestState";

const { markedShape: _markedShape, render } =
  PeerContributionRecognitionTestState;
import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { type Input } from "../../PeerContributionRecognition.schema";
import { assertFocusMovesPointingFingertipFocused as _assertFocusMovesPointingFingertipFocused } from "./assertFocusMovesPointingFingertipFocused";

/**
 * Asserts focus moves the pointing fingertip and acknowledgment anchor to
 * the authored object.
 */
export function assertFocusMovesPointingFingertipContribution({
  contribution,
  input,
}: Readonly<{
  contribution: Readonly<Input["contributions"][number]>;
  input: Readonly<Input>;
}>): void {
  const focused = { ...input, focusedContributionId: contribution.id };
  const point = _markedShape({
    markup: render({ frame: 78, input: focused }),
    marker: "pointing-hand",
  });
  const object = _markedShape({
    markup: render({ frame: 78, input: focused }),
    marker: "focused-object",
  });
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: point, name: "cx" }),
    SvgAttributes.getNumberFromMarkup({ attributes: object, name: "x" }) +
      SvgAttributes.getNumberFromMarkup({ attributes: object, name: "width" }) /
        2,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: point, name: "cy" }),
    SvgAttributes.getNumberFromMarkup({ attributes: object, name: "y" }) +
      SvgAttributes.getNumberFromMarkup({ attributes: object, name: "height" }),
  );
  _assertFocusMovesPointingFingertipFocused({ focused, object, input });
}
