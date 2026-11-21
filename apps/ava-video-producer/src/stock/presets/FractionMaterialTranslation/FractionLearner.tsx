import { Motion } from "../../../motion";
import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { SceneText } from "./SceneText";
import type { VideoMotion } from "../../../videoTheme/makeVideoMotionFromTokens/makeVideoMotionFromTokens";
import type { Input } from "./FractionMaterialTranslation.schema";
import type { ReactNode } from "react";
/** Inputs for getMaterialContact. */
type GetMaterialContactArguments = {
  input: Readonly<
    Pick<Props, "input" | "representation" | "initialX" | "frame">
  >;
  motion: VideoMotion;
};

type Props = {
  input: Input;
  representation: Input["representations"][number];
  initialX: number;
  frame: number;
  accent: string;
};

/** Where the learner's hand touches the material as it is worked. */
function _getMaterialContact({
  input: { input, representation, initialX, frame },
  motion,
}: Readonly<GetMaterialContactArguments>): {
  contactX: number;
  contactY: number;
} {
  const materialProgress = motion.ramp(
    frame,
    36,
    motion.scale(48),
    motion.travel.easing,
  );
  const firstCenter = -96 + 96 / input.fraction.denominator;
  const contactX =
    representation.material === "folded-paper"
      ? initialX - 96
      : initialX +
        (representation.material === "counters"
          ? Motion.mix({ t: materialProgress, from: -82, to: firstCenter })
          : firstCenter);
  const contactY =
    representation.material === "folded-paper"
      ? 306
      : representation.material === "counters"
        ? 330 + Motion.mix({ t: materialProgress, from: -36, to: 0 }) - 8
        : 352 - 44 * materialProgress;
  return { contactX, contactY };
}

/** Draws the FractionLearner group with fixed authored geometry. */
export function FractionLearner({
  input,
  representation,
  initialX,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const handReach =
    motion.ramp(frame, 30, motion.chip) *
    (1 - motion.ramp(frame, 84, motion.press.duration));
  const { contactX, contactY } = _getMaterialContact({
    input: { input, representation, initialX, frame },
    motion,
  });
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
            d: `M${learnerX} 270 L${Motion.mix({ t: handReach, from: learnerX + 18, to: contactX })} ${Motion.mix({ t: handReach, from: 282, to: contactY })}`,
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
