import { mix } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
import { useGraphicMotion } from "../../theme/useGraphicTheme/useGraphicTheme";
import { MeasuringTools } from "./MeasuringTools";
import type { Input } from "./PracticeToWorkSample.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/**
 * One learner physically holds a ruler and repeats a pencil marking gesture.
 */
export function MeasuringLearner({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const motion = useGraphicMotion();
  const transfer = motion.ramp(
    frame,
    56,
    motion.scale(22),
    motion.travel.easing,
  );
  const x = mix(transfer, 330, 550);
  const isApplication = frame >= 78;
  const at = isApplication ? 82 : 24;
  const rulerY = mix(
    motion.ramp(frame, at, motion.whip, motion.travel.easing),
    275,
    330,
  );
  const origin = isApplication ? 620 : 400;
  const progress = motion.ramp(
    frame,
    at + 8,
    motion.hero,
    motion.travel.easing,
  );
  const pencilX = origin + input.task.value * 12 * progress;
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
