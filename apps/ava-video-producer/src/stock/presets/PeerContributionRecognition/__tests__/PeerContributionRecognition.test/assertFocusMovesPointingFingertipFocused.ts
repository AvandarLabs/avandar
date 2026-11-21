import { PeerContributionRecognitionTestState } from "./PeerContributionRecognitionTestState";

const { markedShape: _markedShape, render } =
  PeerContributionRecognitionTestState;

import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { type Input } from "../../PeerContributionRecognition.schema";

/**
 * Asserts focus moves the pointing fingertip and acknowledgment anchor to
 * the authored object.
 */
export function assertFocusMovesPointingFingertipFocused({
  focused,
  object,
  input,
}: Readonly<{
  focused: Readonly<
    Omit<Input, "focusedContributionId"> & {
      focusedContributionId: Readonly<Input["contributions"][number]>["id"];
    }
  >;
  object: string;
  input: Readonly<Input>;
}>): void {
  const hold = render({ frame: 150, input: focused });
  const acknowledgment = _markedShape({
    markup: hold,
    marker: "acknowledgment-anchor",
  });
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: acknowledgment,
      name: "x1",
    }),
    SvgAttributes.getNumberFromMarkup({ attributes: object, name: "x" }) +
      SvgAttributes.getNumberFromMarkup({ attributes: object, name: "width" }) /
        2,
  );
  assert.ok(hold.includes(`aria-label="${input.people.contributor}"`));
  assert.ok(hold.includes(`aria-label="${input.acknowledgment.text}"`));
  assert.match(hold, /data-authorship-byline="true"/);
  assert.doesNotMatch(hold, /data-authorship-tab=/);
}
