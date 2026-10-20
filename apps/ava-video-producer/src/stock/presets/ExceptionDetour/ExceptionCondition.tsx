import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import type { Input } from "./ExceptionDetour.schema";
import type { ReactNode } from "react";
/** Inputs for ExceptionCondition. */
type Props = {
  input: Input;
  targetY: number;
};

/** The condition and path label explicitly identify the exceptional branch. */
export function ExceptionCondition({
  input,
  targetY,
}: Readonly<Props>): ReactNode {
  return (
    <>
      <FitText
        text={input.pathLabels.exception}
        x={515}
        y={targetY + (input.detourSide === "above" ? -58 : 20)}
        width={240}
        fontSize={16}
        maxLines={3}
        anchor="middle"
        color={STOCK.orange}
        breakLongWords
        normalizeWhitespace
      />
      <FitText
        text={input.exception.condition}
        x={220}
        y={targetY - 10}
        width={250}
        fontSize={16}
        maxLines={4}
        anchor="middle"
        color={STOCK.orange}
        breakLongWords
        normalizeWhitespace
      />
    </>
  );
}
