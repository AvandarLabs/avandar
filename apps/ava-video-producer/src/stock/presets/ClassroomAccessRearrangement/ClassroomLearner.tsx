import { EASE, mix, ramp } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
import type { Input } from "./ClassroomAccessRearrangement.schema";
import type { ReactNode } from "react";

type Props = { input: Input; index: number; frame: number; accent: string };
function _getPosition({
  input,
  index,
  frame,
}: Readonly<Omit<Props, "accent">>): { x: number; y: number } {
  const column = index % 3;
  let x = 110 + index * 90;
  let y = index < 3 ? mix(ramp(frame, 36, 24, EASE.inOut), 250, 225) : 250;
  if (index < 3) {
    const progress = ramp(frame, 88, 8, EASE.inOut);
    x = mix(progress, x, 210 + column * 170);
    y = mix(progress, y, 280);
  } else {
    const lane = [210, 550, 600][column];
    x = mix(ramp(frame, 80, 4, EASE.inOut), x, lane);
    x = mix(ramp(frame, 90, 6, EASE.inOut), x, 210 + column * 170);
    y = mix(ramp(frame, 76, 4, EASE.inOut), 250, 285);
    y = mix(ramp(frame, 84, 6, EASE.inOut), y, 450);
  }
  if (input.resolvedLayout === "open-horseshoe") {
    if (index === 0) {
      x = mix(ramp(frame, 96, 4, EASE.inOut), x, 200);
      x = mix(ramp(frame, 104, 4, EASE.inOut), x, 210);
    }
    if (index === 1) {
      x = mix(ramp(frame, 96, 4, EASE.inOut), x, 250);
      y = mix(ramp(frame, 100, 4, EASE.inOut), y, 365);
      x = mix(ramp(frame, 104, 4, EASE.inOut), x, 210);
    }
    if (index === 3) {
      x = mix(ramp(frame, 96, 12, EASE.inOut), x, 290);
    }
    if (index === 4) {
      x = mix(ramp(frame, 96, 12, EASE.inOut), x, 470);
    }
    if (index === 5) {
      y = mix(ramp(frame, 96, 12, EASE.inOut), y, 365);
    }
  }
  return { x, y };
}
/** Stable walking or wheeled icons enter the same shared activity footprint. */
export function ClassroomLearner({
  input,
  index,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const learner = input.learners[index];
  const { x, y } = _getPosition({ input, index, frame });
  return (
    <g
      data-classroom-learner={learner.id}
      data-mobility={learner.movementIcon}
      transform={`translate(${x} ${y})`}
    >
      {learner.movementIcon === "walking" ? (
        <PersonGlyph x={0} y={0} size={36} color={accent} />
      ) : (
        <g stroke={accent} strokeWidth={2} fill="none">
          <circle cx={0} cy={-15} r={6} />
          <path d="M0 -8 V7 H12 L17 20 M0 0 H10" />
          <circle cx={-3} cy={13} r={11} />
        </g>
      )}
      <FitText
        text={String(index + 1)}
        x={-25}
        y={-19}
        width={18}
        fontSize={12}
        maxLines={1}
        normalizeWhitespace
      />
    </g>
  );
}
