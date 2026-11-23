import { Motion } from "../../../motion";
import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { makeObservationLayoutFromInput } from "./makeObservationLayoutFromInput";
import { ObservationSamplingHand } from "./ObservationSamplingHand/ObservationSamplingHand";
import type { VideoMotion } from "../../../videoTheme/makeVideoMotionFromTokens/makeVideoMotionFromTokens";
import type { Input } from "./EnvironmentalObservationGaps.schema";
import type { ReactNode } from "react";

type TeamPosition = {
  x: number;
  y: number;
  handX: number;
  check: ReturnType<typeof makeObservationLayoutFromInput>["checks"][number];
  index: number;
  reach: number;
};
type TeamPhases = {
  returnProgress: number;
  vertical: number;
  approach: number;
  reach: number;
};

/** Inputs for getTeamPosition. */
type GetTeamPositionArguments = {
  frame: number;
  input: Input;
  motion: VideoMotion;
};

/** Inputs for getTeamPhases. */
type GetTeamPhasesArguments = {
  frame: number;
  start: number;
  motion: VideoMotion;
};

function _getTeamPosition({
  frame,
  input,
  motion,
}: Readonly<GetTeamPositionArguments>): TeamPosition | undefined {
  const { checks } = makeObservationLayoutFromInput(input);
  const index = Math.min(
    checks.length - 1,
    Math.max(0, Math.floor((frame - 56) / 18)),
  );
  const check = checks[index];
  if (!check) {
    return undefined;
  }
  const previous = checks[index - 1];
  const start = 56 + index * 18;
  const { returnProgress, vertical, approach, reach } = _getTeamPhases({
    frame,
    start,
    motion,
  });
  const departureX = previous ? previous.x - 20 : 235;
  const x =
    frame < start + 4
      ? Motion.mix({ t: returnProgress, from: departureX, to: 235 })
      : Motion.mix({ t: approach, from: 235, to: check.x - 20 });
  const y = Motion.mix({
    t: vertical,
    from: previous?.y ?? check.y,
    to: check.y,
  });
  return {
    x,
    y,
    handX: x + Motion.mix({ t: reach, from: 6, to: 20 }),
    check,
    index,
    reach,
  };
}
/** Inputs for ObservationFieldTeam. */
type Props = {
  frame: number;
  input: Input;
};

/**
 * The member's return to the band, move along it, approach to the point, and
 * reach, each 0 to 1.
 */
function _getTeamPhases({
  frame,
  start,
  motion,
}: Readonly<GetTeamPhasesArguments>): TeamPhases {
  const step = (offset: number) => {
    return motion.ramp(
      frame,
      start + offset,
      motion.press.duration,
      motion.travel.easing,
    );
  };
  return {
    returnProgress: step(0),
    vertical: step(4),
    approach: step(8),
    reach: motion.ramp(
      frame,
      start + 12,
      motion.scale(2),
      motion.travel.easing,
    ),
  };
}

/**
 * One team member places each point, travelling only along reserved sampling
 * bands.
 */
export function ObservationFieldTeam({
  frame,
  input,
}: Readonly<Props>): ReactNode {
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const position = _getTeamPosition({ frame, input, motion });
  if (!position) {
    return undefined;
  }
  const { x, y, handX, check, reach } = position;
  return (
    <g
      opacity={motion.ramp(frame, 54, motion.press.duration)}
      data-team-position="true"
      data-x={x}
      data-y={y}
    >
      <PersonGlyph
        x={x}
        y={y}
        size={16}
        role="participant"
        color={tokens.color.highlight}
      />
      <ObservationSamplingHand
        {...{ atomic, tokens, scales, x, y, handX, check, reach }}
      />
    </g>
  );
}

/** Result of the authored ObservationFieldTeam calculation. */
export type ObservationFieldTeamGetTeamPositionValue = NonNullable<
  ReturnType<typeof _getTeamPosition>
>;
