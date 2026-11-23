import { PeerContributionRecognitionTestState } from "./PeerContributionRecognitionTestState";

const { markedShape: _markedShape, render } =
  PeerContributionRecognitionTestState;
import { fixtures } from "../../PeerContributionRecognition.fixtures";
import { assertHiddenAuthorshipStaysVisiblyFrame as _assertHiddenAuthorshipStaysVisiblyFrame } from "./assertHiddenAuthorshipStaysVisiblyFrame";

/**
 * Asserts hidden authorship stays visibly beside the focused stationary work
 * throughout hold.
 */
export function assertHiddenAuthorshipStaysVisiblyIndex(index: number): void {
  const input = {
    ...fixtures[3].input,
    focusedContributionId: fixtures[3].input.contributions[index].id,
  };
  const setup = _markedShape({
    markup: render({ frame: 30, input: input }),
    marker: "focused-object",
  });
  [129, 140, 150, 167].forEach((frame) => {
    return _assertHiddenAuthorshipStaysVisiblyFrame({ frame, input, setup });
  });
}
