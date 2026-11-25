import {
  PdfGridReconstructionTestState,
  type AssertCompleteMovingColumnsRemainSourceHeadersOptions,
} from "./PdfGridReconstructionTestState";

const { assertGridTextFitsCell: _assertGridTextFitsCell } =
  PdfGridReconstructionTestState;
import assert from "node:assert/strict";
import { assertCompleteMovingColumnsRemainHeader as _assertCompleteMovingColumnsRemainHeader } from "./assertCompleteMovingColumnsRemainHeader";
import { assertCompleteMovingColumnsRemainResultHeaders as _assertCompleteMovingColumnsRemainResultHeaders } from "./assertCompleteMovingColumnsRemainResultHeaders";

/**
 * Asserts complete moving columns remain distinct from all retained source
 * cells and headers.
 */
export function assertCompleteMovingColumnsRemainSourceHeaders({
  sourceHeaders,
  sourceCells,
  resultHeaders,
  resultCells,
  markup,
  input,
  sourceRight,
  frame,
}: Readonly<AssertCompleteMovingColumnsRemainSourceHeadersOptions>): void {
  [...sourceHeaders, ...sourceCells, ...resultHeaders, ...resultCells].forEach(
    (tag) => {
      return _assertGridTextFitsCell({ markup, tag });
    },
  );
  assert.equal(resultHeaders.length, input.grid.columnLabels.length);
  assert.equal(
    resultCells.length,
    input.grid.rows.length * input.grid.columnLabels.length,
  );
  _assertCompleteMovingColumnsRemainResultHeaders({
    resultHeaders,
    resultCells,
    sourceRight,
    frame,
    sourceHeaders,
    input,
  });
  resultHeaders.forEach((header, columnIndex) => {
    return _assertCompleteMovingColumnsRemainHeader({
      header,
      columnIndex,
      resultHeaders,
      resultCells,
    });
  });
}
