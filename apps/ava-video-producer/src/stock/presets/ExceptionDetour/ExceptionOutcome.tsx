import { FitText } from "../../primitives/FitText/FitText";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { Input } from "./ExceptionDetour.schema";
import type { ReactNode } from "react";
/** Inputs for ExceptionOutcome. */
type Props = {
  input: Input;
  targetY: number;
  accent: string;
};

/** A separate destination contains the authored exceptional outcome. */
export function ExceptionOutcome({
  input,
  targetY,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  return (
    <>
      <StockRect
        x={690}
        y={targetY - 46}
        width={220}
        height={112}
        rx={scales.corner(tokens.corner.card)}
        stroke={accent}
        fill={tokens.color.surface}
      />
      <g data-exception-outcome="true">
        <FitText
          text={input.exception.outcome}
          x={800}
          y={targetY - 16}
          width={194}
          fontSize={18}
          maxLines={4}
          anchor="middle"
          breakLongWords
          normalizeWhitespace
        />
      </g>
    </>
  );
}
