import { mix } from "../../../motion";
import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { SceneText } from "./SceneText";
import type { Input } from "./FractionMaterialTranslation.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  representation: Input["representations"][number];
  initialX: number;
  frame: number;
  accent: string;
};
/** Draws the FractionLearner group with fixed authored geometry. */
export function FractionLearner({
  input,
  representation,
  initialX,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const scales = useGraphicShapeScales();
  const materialProgress = motion.ramp(
    frame,
    36,
    motion.scale(48),
    motion.travel.easing,
  );
  const handReach =
    motion.ramp(frame, 30, motion.chip) *
    (1 - motion.ramp(frame, 84, motion.press.duration));
  const firstCenter = -96 + 96 / input.fraction.denominator;
  const contactX =
    representation.material === "folded-paper"
      ? initialX - 96
      : initialX +
        (representation.material === "counters"
          ? mix(materialProgress, -82, firstCenter)
          : firstCenter);
  const contactY =
    representation.material === "folded-paper"
      ? 306
      : representation.material === "counters"
        ? 330 + mix(materialProgress, -36, 0) - 8
        : 352 - 44 * materialProgress;
  const learnerX = initialX - 60;

  return (
    <>
      <SceneText
        text={representation.learnerLabel}
        anchor="middle"
        slot={[initialX, 162, 230, 14, 2]}
      />
      <g data-fraction-learner={representation.id}>
        <PersonGlyph x={learnerX} y={270} size={64} color={accent} />
        <SketchedShape
          shape={{
            kind: "path",
            d: `M${learnerX} 270 L${mix(handReach, learnerX + 18, contactX)} ${mix(handReach, 282, contactY)}`,
          }}
          profile={tokens.sketch.shape}
          data-material-hand={representation.id}
          fill="none"
          stroke={accent}
          strokeWidth={scales.stroke(tokens.stroke.emphasis)}
        />
      </g>
    </>
  );
}
