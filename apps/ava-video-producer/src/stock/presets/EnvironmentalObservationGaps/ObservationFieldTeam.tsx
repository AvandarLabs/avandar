import { mix } from "../../../motion";
import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { makeObservationLayoutFromInput } from "./makeObservationLayoutFromInput";
import type { VideoMotion } from "../../../videoTheme/createVideoMotion/createVideoMotion";
import type { Input } from "./EnvironmentalObservationGaps.schema";
import type { ReactNode } from "react";

function _getTeamPosition({
  frame,
  input,
  motion,
}: Readonly<{ frame: number; input: Input; motion: VideoMotion }>) {
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
  const returnProgress = motion.ramp(
      frame,
      start,
      motion.press.duration,
      motion.travel.easing,
    ),
    vertical = motion.ramp(
      frame,
      start + 4,
      motion.press.duration,
      motion.travel.easing,
    ),
    approach = motion.ramp(
      frame,
      start + 8,
      motion.press.duration,
      motion.travel.easing,
    ),
    reach = motion.ramp(
      frame,
      start + 12,
      motion.scale(2),
      motion.travel.easing,
    );
  const departureX = previous ? previous.x - 20 : 235;
  const x =
    frame < start + 4
      ? mix(returnProgress, departureX, 235)
      : mix(approach, 235, check.x - 20);
  const y = mix(vertical, previous?.y ?? check.y, check.y);
  return { x, y, handX: x + mix(reach, 6, 20), check, index, reach };
}
/** Inputs for ObservationFieldTeam. */
type Props = { frame: number; input: Input };
const REACH_TINT = 0.3;

/**
 * One team member places each point, travelling only along reserved sampling
 * bands.
 */
export function ObservationFieldTeam({
  frame,
  input,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const scales = useGraphicShapeScales();
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
      <SketchedShape
        shape={{ kind: "path", d: `M ${x + 3} ${y} L ${handX} ${y}` }}
        profile={tokens.sketch.shape}
        stroke={tokens.color.highlight}
        strokeWidth={scales.stroke(tokens.stroke.default)}
        fill="none"
      />
      <circle
        data-sampling-hand="true"
        data-target={check.id}
        cx={handX}
        cy={y}
        r={2}
        fill={tokens.color.highlight}
      />
      {reach > 0 ? (
        <circle
          cx={handX}
          cy={y}
          r={4 * reach}
          fill={tokens.color.highlight}
          fillOpacity={scales.wash(REACH_TINT)}
        />
      ) : undefined}
    </g>
  );
}
