import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../tests/helpers/SvgAttributes";
import { render } from "./SchemaPlanLocalExecutionTestHelpers";

/**
 * Asserts all actual raw rows remain inside the device throughout outbound
 * and inbound travel.
 */
export function assertActualRawRowsRemainBoundary({
  boundary,
  markup,
}: Readonly<{ boundary: string; markup: ReturnType<typeof render> }>): void {
  const edge =
    SvgAttributes.getNumberFromMarkup({ attributes: boundary, name: "x" }) +
    SvgAttributes.getNumberFromMarkup({ attributes: boundary, name: "width" });
  [...markup.matchAll(/<rect[^>]*data-row-body="[^"]*"[^>]*>/g)].forEach(
    ([row]) => {
      assert.ok(
        SvgAttributes.getNumberFromMarkup({ attributes: row, name: "x" }) >=
          SvgAttributes.getNumberFromMarkup({
            attributes: boundary,
            name: "x",
          }),
      );
      assert.ok(
        SvgAttributes.getNumberFromMarkup({ attributes: row, name: "x" }) +
          SvgAttributes.getNumberFromMarkup({
            attributes: row,
            name: "width",
          }) <
          edge,
      );
    },
  );
}
