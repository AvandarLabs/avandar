import { FitText } from "../../../primitives/FitText/FitText";
import type { Input } from "../EnvironmentalObservationGaps.schema";
import type { ReactNode } from "react";

/** Data for Props. */
type PropsCell = { x: number; y: number; width: number; height: number };
type Props = {
  cell: Input["cells"][number] & PropsCell;
  value: (Input["cells"][number] & PropsCell)["value"];
};
/** Displays the cell label and its literal observed or missing value. */
export function ObservationCellCopy({
  cell,
  value,
}: Readonly<Props>): ReactNode {
  return (
    <>
      <FitText
        text={cell.label}
        x={cell.x + 10}
        y={cell.y + 14}
        width={cell.width - 20}
        fontSize={12}
        maxLines={3}
        breakLongWords
        normalizeWhitespace
      />
      <FitText
        text={value === null ? "?" : String(value)}
        x={cell.x + 10}
        y={cell.y + 58}
        width={cell.width - 20}
        fontSize={12}
        maxLines={2}
        breakLongWords
        normalizeWhitespace
      />
    </>
  );
}
