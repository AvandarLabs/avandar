import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { type AssertCompleteMovingColumnsRemainResultHeadersOptions } from "./PdfGridReconstructionTestState";

/**
 * Asserts complete moving columns remain distinct from all retained source
 * cells and headers.
 */
export function assertCompleteMovingColumnsRemainResultHeaders({
  resultHeaders,
  resultCells,
  sourceRight,
  frame,
  sourceHeaders,
  input,
}: Readonly<AssertCompleteMovingColumnsRemainResultHeadersOptions>): void {
  [...resultHeaders, ...resultCells].forEach((tag) => {
    assert.ok(
      SvgAttributes.getNumberFromMarkup({ attributes: tag, name: "x" }) >
        sourceRight + 8,
      `result overprints source at ${frame}: ${tag}`,
    );
    assert.ok(
      tag.includes('fill="none"'),
      "no opaque result hides the retained source",
    );
    assert.ok(
      SvgAttributes.getNumberFromMarkup({ attributes: tag, name: "x" }) +
        SvgAttributes.getNumberFromMarkup({ attributes: tag, name: "width" }) +
        0.5 <
        960,
    );
  });
  sourceHeaders.forEach((header, columnIndex) => {
    return assert.equal(
      SvgAttributes.getNumberFromMarkup({ attributes: header, name: "x" }),
      52 + (columnIndex * 400) / input.grid.columnLabels.length,
    );
  });
}
