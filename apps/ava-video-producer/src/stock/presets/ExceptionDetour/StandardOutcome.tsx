import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import type { Input } from "./ExceptionDetour.schema";
import type { ReactNode } from "react";
/** Inputs for StandardOutcome. */
type Props = { input: Input };

/**
 * The normal destination and path label occupy the side opposite the detour.
 */
export function StandardOutcome({ input }: Readonly<Props>): ReactNode {
  const side = input.detourSide === "above" ? -1 : 1;
  return (
    <>
      <g data-standard-outcome="true">
        <FitText
          text={input.rule.outcome}
          x={790}
          y={side < 0 ? 330 : 210}
          width={200}
          fontSize={18}
          maxLines={4}
          anchor="middle"
          breakLongWords
          normalizeWhitespace
        />
      </g>
      <FitText
        text={input.pathLabels.standard}
        x={550}
        y={side < 0 ? 340 : 240}
        width={210}
        fontSize={16}
        maxLines={3}
        anchor="middle"
        color={STOCK.muted}
        breakLongWords
        normalizeWhitespace
      />
    </>
  );
}
