import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../tests/helpers/SvgAttributes";
import { fixtures } from "../UtteranceToModelDraft.fixtures";
import { _render, _attributes } from "./UtteranceToModelDraftTestHelpers";

/**
 * Asserts only one phrase copy travels and role captions wait until all
 * copies finish.
 */
export function assertOnlyOnePhraseCopyFrame({
  frame,
  input,
}: Readonly<{
  frame: number[][number];
  input: (typeof fixtures)[number]["input"];
}>): void {
  const markup = _render({ frame: frame, input: input });
  const copies = _attributes({ markup, marker: "phrase-copy" });
  const sockets = _attributes({ markup, marker: "model-item" });
  assert.equal(copies.length, 3 + input.draft.attributes.length);
  assert.equal(sockets.length, copies.length);
  const active = copies.filter((copy) => {
    return (
      SvgAttributes.getNumberFromMarkup({ attributes: copy, name: "opacity" }) >
      0
    );
  });
  assert.ok(active.length <= 1, `frame ${frame}: overlapping phrase copies`);
  if (active.length) {
    sockets.forEach((socket) => {
      return assert.equal(
        SvgAttributes.getNumberFromMarkup({
          attributes: socket,
          name: "opacity",
        }),
        0,
      );
    });
  }
  if (frame === 105) {
    assert.equal(active.length, 0);
    sockets.forEach((socket) => {
      return assert.equal(
        SvgAttributes.getNumberFromMarkup({
          attributes: socket,
          name: "opacity",
        }),
        1,
      );
    });
  }
}
