import { PdfGridReconstructionTestState } from "./PdfGridReconstructionTestState";

const { render: _render } = PdfGridReconstructionTestState;
import assert from "node:assert/strict";
import { type Input } from "../../PdfGridReconstruction.schema";
import { assertCompleteMovingColumnsRemainSourceHeaders as _assertCompleteMovingColumnsRemainSourceHeaders } from "./assertCompleteMovingColumnsRemainSourceHeaders";
import { makeCompleteMovingColumnsRemainMarkupFromMarkup as _makeCompleteMovingColumnsRemainMarkupFromMarkup } from "./makeCompleteMovingColumnsRemainMarkupFromMarkup";

/**
 * Asserts complete moving columns remain distinct from all retained source
 * cells and headers.
 */
export function assertCompleteMovingColumnsRemainFrame({
  frame,
  input,
}: Readonly<{ frame: number; input: Readonly<Input> }>): void {
  const markup = _render({ frame: frame, input: input });
  const { rectangles, sourceRight, sourceHeaders, resultHeaders, resultCells } =
    _makeCompleteMovingColumnsRemainMarkupFromMarkup({ markup, input });
  const sourceCells = rectangles.filter((tag) => {
    return tag.includes("data-source-cell=");
  });
  _assertCompleteMovingColumnsRemainSourceHeaders({
    sourceHeaders,
    sourceCells,
    resultHeaders,
    resultCells,
    markup,
    input,
    sourceRight,
    frame,
  });
  assert.ok(
    markup.indexOf("data-source-page=") < markup.indexOf("data-source-cell="),
  );
  assert.ok(
    markup.indexOf("data-source-cell=") < markup.indexOf("data-result-cell="),
  );
}
