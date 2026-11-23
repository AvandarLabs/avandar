import { Motion } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { VideoMotion } from "../../../videoTheme/makeVideoMotionFromTokens/makeVideoMotionFromTokens";
import type { Input } from "./ClassroomAccessRearrangement.schema";
import type { ReactNode } from "react";

type GetHorseshoeFrontPositionOptions = {
  index: number;
  frame: number;
  motion: VideoMotion;
  input: Position;
};
type GetHorseshoeBackPositionOptions = {
  index: number;
  frame: number;
  motion: VideoMotion;
  input: Position;
};
type Props = {
  input: Input;
  index: number;
  frame: number;
  accent: string;
};
function _getPosition({
  input,
  index,
  frame,
  motion,
}: Readonly<
  Omit<Props, "accent"> & {
    motion: VideoMotion;
  }
>): Position {
  const position =
    index < 3
      ? _getSeatedPosition({ index, frame, motion })
      : _getEnteringPosition({ index, frame, motion });
  return input.resolvedLayout === "open-horseshoe"
    ? index < 3
      ? _getHorseshoeFrontPosition({ index, frame, motion, input: position })
      : _getHorseshoeBackPosition({ index, frame, motion, input: position })
    : position;
}
type Position = {
  x: number;
  y: number;
};
/** The first three learners rise from their desks, then move to a column. */
function _getSeatedPosition({
  index,
  frame,
  motion,
}: Readonly<{
  index: number;
  frame: number;
  motion: VideoMotion;
}>): Position {
  const column = index % 3;
  const y = Motion.mix({
    t: motion.ramp(frame, 36, motion.scale(24), motion.travel.easing),
    from: 250,
    to: 225,
  });
  const progress = motion.ramp(frame, 88, motion.whip, motion.travel.easing);
  return {
    x: Motion.mix({
      t: progress,
      from: 110 + index * 90,
      to: 210 + column * 170,
    }),
    y: Motion.mix({
      t: progress,
      from: y,
      to: 280,
    }),
  };
}
/** The other learners step into a lane, then walk down to their column. */
function _getEnteringPosition({
  index,
  frame,
  motion,
}: Readonly<{
  index: number;
  frame: number;
  motion: VideoMotion;
}>): Position {
  const column = index % 3;
  const lane = [210, 550, 600][column];
  let x = Motion.mix({
    t: motion.ramp(frame, 80, motion.press.duration, motion.travel.easing),
    from: 110 + index * 90,
    to: lane,
  });
  x = Motion.mix({
    t: motion.ramp(frame, 90, motion.chip, motion.travel.easing),
    from: x,
    to: 210 + column * 170,
  });
  const y = Motion.mix({
    t: motion.ramp(frame, 76, motion.press.duration, motion.travel.easing),
    from: 250,
    to: 285,
  });
  return {
    x,
    y: Motion.mix({
      t: motion.ramp(frame, 84, motion.chip, motion.travel.easing),
      from: y,
      to: 450,
    }),
  };
}
/** In the open horseshoe, the first two learners step around the table. */
function _getHorseshoeFrontPosition({
  index,
  frame,
  motion,
  input: { x, y },
}: Readonly<GetHorseshoeFrontPositionOptions>): Position {
  const step = (at: number): number => {
    return motion.ramp(frame, at, motion.press.duration, motion.travel.easing);
  };
  return index === 0 || index === 1
    ? {
        x: Motion.mix({
          t: step(104),
          from: Motion.mix({
            t: step(96),
            from: x,
            to: index === 0 ? 200 : 250,
          }),
          to: 210,
        }),
        y: index === 1 ? Motion.mix({ t: step(100), from: y, to: 365 }) : y,
      }
    : { x, y };
}
/** In the open horseshoe, three of the back learners close the curve. */
function _getHorseshoeBackPosition({
  index,
  frame,
  motion,
  input: { x, y },
}: Readonly<GetHorseshoeBackPositionOptions>): Position {
  const progress = motion.ramp(
    frame,
    96,
    motion.scale(12),
    motion.travel.easing,
  );
  return index === 3 || index === 4
    ? {
        x: Motion.mix({ t: progress, from: x, to: index === 3 ? 290 : 470 }),
        y,
      }
    : index === 5
      ? { x, y: Motion.mix({ t: progress, from: y, to: 365 }) }
      : { x, y };
}
/** Stable walking or wheeled icons enter the same shared activity footprint. */
export function ClassroomLearner({
  input,
  index,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const motion = GraphicThemeHooks.useGraphicMotion();
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
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
