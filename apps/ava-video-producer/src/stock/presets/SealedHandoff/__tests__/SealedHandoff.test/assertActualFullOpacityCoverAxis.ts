import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";

/**
 * Asserts the actual full-opacity cover bounds enclose the still-painted
 * brief throughout transit.
 */
export function assertActualFullOpacityCoverAxis({
  axis,
  cover,
  paper,
}: Readonly<{
  axis: string;
  cover: string;
  paper: string;
}>): void {
  const extent = axis === "x" ? "width" : "height";
  assert.ok(
    SvgAttributes.getNumberFromMarkup({ attributes: cover, name: axis }) <=
      SvgAttributes.getNumberFromMarkup({ attributes: paper, name: axis }),
  );
  assert.ok(
    SvgAttributes.getNumberFromMarkup({ attributes: cover, name: axis }) +
      SvgAttributes.getNumberFromMarkup({ attributes: cover, name: extent }) >=
      SvgAttributes.getNumberFromMarkup({ attributes: paper, name: axis }) +
        SvgAttributes.getNumberFromMarkup({ attributes: paper, name: extent }),
  );
}
