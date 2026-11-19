import { FitText } from "../../primitives/FitText/FitText";
import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { getSpliceGeometryFromInputAndFrame } from "./getSpliceGeometryFromInputAndFrame";
import type { ReactNode } from "react";

type Props = {
  step: ReturnType<typeof getSpliceGeometryFromInputAndFrame>[number];
  index: number;
  frame: number;
  accent: string;
};

/** A step's corner before the corner style scales it. */
const STEP_CORNER = 5;
/**
 * A readable operation stays upright while traveling into its requested gap.
 */
export function SpliceModule({
  step,
  index,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  const motion = useGraphicMotion();
  return (
    <g
      data-step={step.id}
      transform={`translate(${step.x} ${step.y})`}
      opacity={motion.reveal(frame, 12 + index * motion.stagger.list)}
    >
      <StockRect
        data-step-body={step.id}
        x={0}
        y={0}
        width={140}
        height={110}
        rx={scales.corner(STEP_CORNER)}
        fill={tokens.color.surface}
        stroke={step.isInserted ? accent : tokens.color.line}
        strokeWidth={scales.stroke(
          step.isInserted ? tokens.stroke.default : tokens.stroke.hairline,
        )}
      />
      <SketchedShape
        shape={{ kind: "path", d: "M14 16h32" }}
        profile={tokens.sketch.shape}
        stroke={step.isInserted ? accent : tokens.color.inactive}
        strokeWidth={scales.stroke(tokens.stroke.emphasis)}
      />
      <FitText
        text={step.label}
        x={70}
        y={38}
        width={134}
        anchor="middle"
        fontSize={14}
        maxLines={4}
        breakLongWords
        normalizeWhitespace
      />
    </g>
  );
}
