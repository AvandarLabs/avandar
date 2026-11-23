import { SpatialGridBinningTestState } from "./SpatialGridBinningTestState";

const { render: _render } = SpatialGridBinningTestState;

import assert from "node:assert/strict";
import { getSvgAttributeMatchesFromMarkup } from "../../../../../../tests/helpers/getSvgAttributeMatchesFromMarkup/getSvgAttributeMatchesFromMarkup";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { SvgPaintAssertions } from "../../../../../../tests/helpers/SvgPaintAssertions/SvgPaintAssertions";
import { type Input } from "../../SpatialGridBinning.schema";

/**
 * Asserts zero copy owns an explicit zero sample even when every observed
 * cell is nonzero.
 */
export function assertZeroCopyOwnsExplicitFrame({
  frame,
  input,
}: Readonly<{ frame: number; input: Readonly<Input> }>): void {
  const markup = _render({ frame: frame, input: input });
  const sample = getSvgAttributeMatchesFromMarkup({
    markup: markup,
    attribute: "data-zero-sample",
  }).tags[0];
  assert.ok(sample);
  const paint = SvgPaintAssertions.getVisiblePaintEnvelopesFromMarkup(markup);
  const caption = paint.find((item) => {
    return (
      item.kind === "text" &&
      item.ariaLabel === input.labels.zero &&
      item.left >= 450 &&
      item.top < 150
    );
  })!;
  assert.ok(
    caption.left >
      SvgAttributes.getNumberFromMarkup({ attributes: sample, name: "x" }) +
        SvgAttributes.getNumberFromMarkup({
          attributes: sample,
          name: "width",
        }),
  );
  assert.ok(
    caption.left -
      SvgAttributes.getNumberFromMarkup({ attributes: sample, name: "x" }) -
      SvgAttributes.getNumberFromMarkup({
        attributes: sample,
        name: "width",
      }) <=
      20,
  );
  assert.ok(
    getSvgAttributeMatchesFromMarkup({
      markup: markup,
      attribute: "data-zero-value",
    }).tags[0].includes('data-zero-value="0"'),
  );
}
