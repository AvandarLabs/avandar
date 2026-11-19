import { mix } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { VideoMotion } from "../../../videoTheme/createVideoMotion/createVideoMotion";
import type { Input } from "./ClassroomAccessRearrangement.schema";
import type { ReactNode } from "react";

type Props = { input: Input; index: number; frame: number; accent: string };
function _getPosition({
  input,
  index,
  frame,
  motion,
}: Readonly<Omit<Props, "accent"> & { motion: VideoMotion }>): {
  x: number;
  y: number;
} {
  const column = index % 3;
  let x = 110 + index * 90;
  let y =
    index < 3
      ? mix(
          motion.ramp(frame, 36, motion.scale(24), motion.travel.easing),
          250,
          225,
        )
      : 250;
  if (index < 3) {
    const progress = motion.ramp(frame, 88, motion.whip, motion.travel.easing);
    x = mix(progress, x, 210 + column * 170);
    y = mix(progress, y, 280);
  } else {
    const lane = [210, 550, 600][column];
    x = mix(
      motion.ramp(frame, 80, motion.press.duration, motion.travel.easing),
      x,
      lane,
    );
    x = mix(
      motion.ramp(frame, 90, motion.chip, motion.travel.easing),
      x,
      210 + column * 170,
    );
    y = mix(
      motion.ramp(frame, 76, motion.press.duration, motion.travel.easing),
      250,
      285,
    );
    y = mix(motion.ramp(frame, 84, motion.chip, motion.travel.easing), y, 450);
  }
  if (input.resolvedLayout === "open-horseshoe") {
    if (index === 0) {
      x = mix(
        motion.ramp(frame, 96, motion.press.duration, motion.travel.easing),
        x,
        200,
      );
      x = mix(
        motion.ramp(frame, 104, motion.press.duration, motion.travel.easing),
        x,
        210,
      );
    }
    if (index === 1) {
      x = mix(
        motion.ramp(frame, 96, motion.press.duration, motion.travel.easing),
        x,
        250,
      );
      y = mix(
        motion.ramp(frame, 100, motion.press.duration, motion.travel.easing),
        y,
        365,
      );
      x = mix(
        motion.ramp(frame, 104, motion.press.duration, motion.travel.easing),
        x,
        210,
      );
    }
    if (index === 3) {
      x = mix(
        motion.ramp(frame, 96, motion.scale(12), motion.travel.easing),
        x,
        290,
      );
    }
    if (index === 4) {
      x = mix(
        motion.ramp(frame, 96, motion.scale(12), motion.travel.easing),
        x,
        470,
      );
    }
    if (index === 5) {
      y = mix(
        motion.ramp(frame, 96, motion.scale(12), motion.travel.easing),
        y,
        365,
      );
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
  const motion = useGraphicMotion();
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  const learner = input.learners[index];
  const { x, y } = _getPosition({ input, index, frame, motion });
  return (
    <g
      data-classroom-learner={learner.id}
      data-mobility={learner.movementIcon}
      transform={`translate(${x} ${y})`}
    >
      {learner.movementIcon === "walking" ? (
        <PersonGlyph x={0} y={0} size={36} color={accent} />
      ) : (
        <g
          stroke={accent}
          strokeWidth={scales.stroke(tokens.stroke.default)}
          fill="none"
        >
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
