import { mix } from "../../../motion";
import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { getTeamMarkerPoseFromInputAndFrame } from "./getTeamMarkerPoseFromInputAndFrame";
import type { Input } from "./CommunityCoordinationTable.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/**
 * A representative indicates the destination and the team handles its token.
 */
export function CoordinationActors({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const scales = useGraphicShapeScales();
  const movingIndex = input.teams.findIndex((team) => {
    return team.initialPlaceId !== team.agreedPlaceId;
  });
  const destination = input.places.find((place) => {
    return place.id === input.teams[movingIndex].agreedPlaceId;
  })!;
  const pointing = motion.ramp(
    frame,
    24,
    motion.scale(12),
    motion.travel.easing,
  );
  const handX = mix(pointing, 370, 340 + destination.x * 270);
  const handY = mix(pointing, 485, 160 + destination.y * 280);
  const marker = getTeamMarkerPoseFromInputAndFrame({
    motion,
    input,
    index: movingIndex,
    frame,
  });
  const handling = frame >= 44 && frame <= 100;
  const bodyX = handling ? marker.x + 42 : 612;
  const bodyY = handling ? marker.y - 45 : 460;
  const teamHandX = handling ? marker.x : 592;
  const teamHandY = handling ? marker.y : 475;
  return (
    <g>
      <PersonGlyph
        x={350}
        y={485}
        size={40}
        color={tokens.color.highlight}
        role="facilitator"
      />
      <SketchedShape
        shape={{
          kind: "path",
          d: `M350 485 L${(350 + handX) / 2} ${handY + 24} L${handX} ${handY}`,
        }}
        profile={tokens.sketch.shape}
        data-community-arm
        fill="none"
        stroke={tokens.color.highlight}
        strokeWidth={scales.stroke(tokens.stroke.emphasis)}
      />
      <circle
        data-community-hand
        cx={handX}
        cy={handY}
        r={3}
        fill={tokens.color.highlight}
      />
      <PersonGlyph x={bodyX} y={bodyY} size={36} color={accent} role="worker" />
      <SketchedShape
        shape={{
          kind: "path",
          d: `M${bodyX} ${bodyY} L${bodyX - 12} ${teamHandY + 12} L${teamHandX} ${teamHandY}`,
        }}
        profile={tokens.sketch.shape}
        data-team-arm
        fill="none"
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.emphasis)}
      />
      <circle
        data-team-hand
        cx={teamHandX}
        cy={teamHandY}
        r={3}
        fill={accent}
      />
    </g>
  );
}
