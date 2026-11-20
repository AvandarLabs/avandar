import { mix } from "../../../motion";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { FractionLearner } from "./FractionLearner";
import { FractionSurface } from "./FractionSurface/FractionSurface";
import { SceneText } from "./SceneText";
import type { Input } from "./FractionMaterialTranslation.schema";
import type { ReactNode } from "react";

type Props = {
  representation: Input["representations"][number];
  index: number;
  input: Input;
  frame: number;
  accent: string;
};
/** Distinct learners retain their own materials as the work surfaces align. */
export function FractionDesk({
  representation,
  index,
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const motion = GraphicThemeHooks.useGraphicMotion();
  const initialX =
    input.representations.length === 2 ? 270 + index * 420 : 180 + index * 300;
  const finalX =
    input.representations.length === 2 ? 350 + index * 260 : 240 + index * 240;
  const comparison =
    input.resolvedArrangement === "shared-table"
      ? motion.ramp(frame, 88, motion.scale(20), motion.travel.easing)
      : 0;
  const x = mix(comparison, initialX, finalX);
  const y = mix(comparison, 330, 360);
  return (
    <g>
      <FractionLearner
        input={input}
        representation={representation}
        initialX={initialX}
        frame={frame}
        accent={accent}
      />
      <FractionSurface
        input={input}
        representation={representation}
        x={x}
        y={y}
        frame={frame}
        accent={accent}
      />
      <SceneText
        text={representation.materialLabel}
        anchor="middle"
        slot={[x, 462, 220, 14, 3]}
      />
      {input.showFractionNotation ? (
        <SceneText
          text={`${input.fraction.numerator} / ${input.fraction.denominator}`}
          anchor="middle"
          slot={[x, 540, 220, 18, 1]}
        />
      ) : undefined}
    </g>
  );
}
