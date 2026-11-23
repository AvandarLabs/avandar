import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../tests/helpers/SvgAttributes";
import { type AssertOriginalSourceCaptionPaintMarkupOptions } from "./UtteranceToModelDraftOriginalSourceAndCaptionTestState.types";

/** Asserts an independently authored portion of the rendered contract. */
export function assertOriginalSourceCaptionPaintMarkup({
  markup,
  input,
  backing,
  bottom,
}: Readonly<AssertOriginalSourceCaptionPaintMarkupOptions>): void {
  const fragments = [
    ...markup.matchAll(/data-source-fragment="[^"]+"><text([^>]+)>/g),
  ];
  assert.equal(fragments.length, input.sentenceParts.length);
  fragments.forEach((fragment) => {
    assert.ok(
      SvgAttributes.getNumberFromMarkup({
        attributes: fragment[1],
        name: "y",
      }) -
        12 >=
        SvgAttributes.getNumberFromMarkup({ attributes: backing, name: "y" }),
    );
    assert.ok(
      SvgAttributes.getNumberFromMarkup({
        attributes: fragment[1],
        name: "y",
      }) +
        12 <=
        bottom,
    );
  });
}
