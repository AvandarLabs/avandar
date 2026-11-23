import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../tests/helpers/SvgAttributes";
import { fixtures } from "../UtteranceToModelDraft.fixtures";
import { assertOnlyOnePhraseCopyFrame as _assertOnlyOnePhraseCopyFrame } from "./assertOnlyOnePhraseCopyFrame";
import { _render, _attributes } from "./UtteranceToModelDraftTestHelpers";

/**
 * Asserts only one phrase copy travels and role captions wait until all
 * copies finish.
 */
export function assertOnlyOnePhraseCopyInput(
  input: (typeof fixtures)[number]["input"],
): void {
  Array.from(
    { length: Math.max(0, Math.floor((105 - 49) / 1) + 1) },
    (_, sampleIndex) => {
      return 49 + sampleIndex * 1;
    },
  ).forEach((frame) => {
    return _assertOnlyOnePhraseCopyFrame({ frame, input });
  });
  [55, 60].forEach((frame) => {
    return assert.ok(
      _attributes({
        markup: _render({ frame: frame, input: input }),
        marker: "phrase-copy",
      }).some((copy) => {
        return (
          SvgAttributes.getNumberFromMarkup({
            attributes: copy,
            name: "opacity",
          }) > 0
        );
      }),
    );
  });
}
