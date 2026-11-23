import { FitText } from "../../../primitives/FitText/FitText";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { type Props } from "./SpliceModuleShared/SpliceModuleShared.types";
import { StepBody } from "./StepBody";
import type { ReactNode } from "react";
/**
 * A readable operation stays upright while traveling into its requested gap.
 */
export function SpliceModule({
  step,
  index,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const motion = GraphicThemeHooks.useGraphicMotion();
  return (
    <g
      data-step={step.id}
      transform={`translate(${step.x} ${step.y})`}
      opacity={motion.reveal(frame, 12 + index * motion.stagger.list)}
    >
      <StepBody step={step} accent={accent} />
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
