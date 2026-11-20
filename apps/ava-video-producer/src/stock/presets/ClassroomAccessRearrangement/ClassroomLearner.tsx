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
}: Readonly<Omit<Props, "accent"> & { motion: VideoMotion }>): Position {
  const position =
    index < 3
      ? _getSeatedPosition(index, frame, motion)
      : _getEnteringPosition(index, frame, motion);
  if (input.resolvedLayout !== "open-horseshoe") {
    return position;
  }
  return index < 3
    ? _getHorseshoeFrontPosition(index, frame, motion, position)
    : _getHorseshoeBackPosition(index, frame, motion, position);
}

type Position = { x: number; y: number };

/** The first three learners rise from their desks, then move to a column. */
function _getSeatedPosition(
  index: number,
  frame: number,
  motion: VideoMotion,
): Position {
  const column = index % 3;
  const y = mix(
    motion.ramp(frame, 36, motion.scale(24), motion.travel.easing),
    250,
    225,
  );
  const progress = motion.ramp(frame, 88, motion.whip, motion.travel.easing);
  return {
    x: mix(progress, 110 + index * 90, 210 + column * 170),
    y: mix(progress, y, 280),
  };
}

/** The other learners step into a lane, then walk down to their column. */
function _getEnteringPosition(
  index: number,
  frame: number,
  motion: VideoMotion,
): Position {
  const column = index % 3;
  const lane = [210, 550, 600][column];
  let x = mix(
    motion.ramp(frame, 80, motion.press.duration, motion.travel.easing),
    110 + index * 90,
    lane,
  );
  x = mix(
    motion.ramp(frame, 90, motion.chip, motion.travel.easing),
    x,
    210 + column * 170,
  );
  const y = mix(
    motion.ramp(frame, 76, motion.press.duration, motion.travel.easing),
    250,
    285,
  );
  return {
    x,
    y: mix(motion.ramp(frame, 84, motion.chip, motion.travel.easing), y, 450),
  };
}

/** In the open horseshoe, the first two learners step around the table. */
function _getHorseshoeFrontPosition(
  index: number,
  frame: number,
  motion: VideoMotion,
  { x, y }: Position,
): Position {
  const step = (at: number) => {
    return motion.ramp(frame, at, motion.press.duration, motion.travel.easing);
  };
  if (index === 0) {
    return { x: mix(step(104), mix(step(96), x, 200), 210), y };
  }
  if (index === 1) {
    return {
      x: mix(step(104), mix(step(96), x, 250), 210),
      y: mix(step(100), y, 365),
    };
  }
  return { x, y };
}

/** In the open horseshoe, three of the back learners close the curve. */
function _getHorseshoeBackPosition(
  index: number,
  frame: number,
  motion: VideoMotion,
  { x, y }: Position,
): Position {
  const progress = motion.ramp(
    frame,
    96,
    motion.scale(12),
    motion.travel.easing,
  );
  if (index === 3) {
    return { x: mix(progress, x, 290), y };
  }
  if (index === 4) {
    return { x: mix(progress, x, 470), y };
  }
  return index === 5 ? { x, y: mix(progress, y, 365) } : { x, y };
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
