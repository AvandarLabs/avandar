import { DEFAULT_INPUT } from "../../PdfNearestLabelReview.fixtures";
import { assertCornerExtractionRowsKeepFrame as _assertCornerExtractionRowsKeepFrame } from "./assertCornerExtractionRowsKeepFrame";

/** Asserts the independently authored rendered test contract. */
export function assertCornerExtractionRowsKeepShowDistanceValues({
  showDistanceValues,
  x,
  y,
}: Readonly<{ showDistanceValues: boolean; x: number; y: number }>): void {
  const input = {
    ...DEFAULT_INPUT,
    figure: { text: "界".repeat(12), x, y },
    labels: [
      {
        id: "far",
        text: "界".repeat(20),
        x: x === 5 ? 95 : 5,
        y: y === 5 ? 95 : 5,
      },
      { id: "near", text: "界".repeat(20), x: x === 5 ? 95 : 5, y },
    ],
    reviewedLabelId: "far",
    showDistanceValues,
    copy: {
      ...DEFAULT_INPUT.copy,
      result: `界 ${"界".repeat(23)} ${"界".repeat(8)}`,
    },
  };
  [96.5, 103, 108, 118, 130, 139, 150].forEach((frame) => {
    return _assertCornerExtractionRowsKeepFrame({
      frame,
      input,
      x,
      y,
      showDistanceValues,
    });
  });
}
