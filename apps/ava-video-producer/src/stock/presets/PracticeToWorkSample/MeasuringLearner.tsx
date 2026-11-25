import { Motion } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { MeasuringTools } from "./MeasuringTools/MeasuringTools";
import type { VideoMotion } from "../../../videoTheme/makeVideoMotionFromTokens/makeVideoMotionFromTokens";
import type { Input } from "./PracticeToWorkSample.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  frame: number;
  accent: string;
};
/**
 * One learner physically holds a ruler and repeats a pencil marking gesture.
 */
export function MeasuringLearner({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const motion = GraphicThemeHooks.useGraphicMotion();
  const { x, isApplication, rulerY, origin, pencilX } = _getMeasuringPose({
    input,
    frame,
    motion,
  });
  const isMeasuring =
    (frame >= 24 && frame <= 54) || (frame >= 82 && frame <= 112);
  return (
    <g data-practice-learner="one">
      <PersonGlyph x={x} y={235} size={44} color={accent} />
      <FitText
        text={input.learnerLabel}
        x={x}
        y={188}
        width={320}
        fontSize={14}
        maxLines={2}
        anchor="middle"
        breakLongWords
        normalizeWhitespace
      />
      <MeasuringTools
        input={input}
        isMeasuring={isMeasuring}
        isApplication={isApplication}
        x={x}
        origin={origin}
        rulerY={rulerY}
        pencilX={pencilX}
        accent={accent}
      />
    </g>
  );
}
/**
 * The learner moves from practice to application; at each, the ruler lowers
 * and the pencil marks the measured length from the ruler's origin.
 */
function _getMeasuringPose({
  input,
  frame,
  motion,
}: Readonly<{
  input: Input;
  frame: number;
  motion: VideoMotion;
}>) {
  const transfer = motion.ramp(
    frame,
    56,
    motion.scale(22),
    motion.travel.easing,
  );
  const isApplication = frame >= 78;
  const at = isApplication ? 82 : 24;
  const origin = isApplication ? 620 : 400;
  const progress = motion.ramp(
    frame,
    at + 8,
    motion.hero,
    motion.travel.easing,
  );
  return {
    x: Motion.mix({
      t: transfer,
      from: 330,
      to: 550,
    }),
    isApplication,
    rulerY: Motion.mix({
      t: motion.ramp(frame, at, motion.whip, motion.travel.easing),
      from: 275,
      to: 330,
    }),
    origin,
    pencilX: origin + input.task.value * 12 * progress,
  };
}
