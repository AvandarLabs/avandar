import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { type Input } from "../../PdfGridReconstruction.schema";
import { type MakeCompleteMovingColumnsRemainMarkupFromMarkupResult } from "./PdfGridReconstructionTestState";

/**
 * Makes fresh fixture state for complete moving columns remain distinct from
 * all retained source cells and headers.
 */
export function makeCompleteMovingColumnsRemainMarkupFromMarkup({
  markup,
  input,
}: Readonly<{
  markup: string;
  input: Readonly<Input>;
}>): MakeCompleteMovingColumnsRemainMarkupFromMarkupResult {
  const rectangles = [...markup.matchAll(/<rect[^>]+>/g)].map(([tag]) => {
    return tag;
  });
  const sourcePage = SvgAttributes.fromMarker({
    markup,
    marker: "source-page",
  });
  const sourceRight =
    SvgAttributes.getNumberFromMarkup({ attributes: sourcePage, name: "x" }) +
    SvgAttributes.getNumberFromMarkup({
      attributes: sourcePage,
      name: "width",
    });
  const headers = rectangles.filter((tag) => {
    return tag.includes('height="80"');
  });
  const sourceHeaders = headers.slice(0, input.grid.columnLabels.length);
  const resultHeaders = headers.slice(input.grid.columnLabels.length);
  const resultCells = rectangles.filter((tag) => {
    return tag.includes("data-result-cell=");
  });
  return { rectangles, sourceRight, sourceHeaders, resultHeaders, resultCells };
}
