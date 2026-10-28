import { EASE, mix, ramp } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
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
  const transfer = ramp(frame, 56, 22, EASE.inOut);
  const x = mix(transfer, 330, 550);
  const isApplication = frame >= 78;
  const at = isApplication ? 82 : 24;
  const rulerY = mix(ramp(frame, at, 8, EASE.inOut), 275, 330);
  const origin = isApplication ? 620 : 400;
  const progress = ramp(frame, at + 8, 18, EASE.inOut);
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
