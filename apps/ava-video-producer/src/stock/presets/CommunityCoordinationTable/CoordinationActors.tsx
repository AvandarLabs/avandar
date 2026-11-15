import { EASE, mix, ramp } from "../../../motion";
import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
import { STOCK } from "../../stockPalette";
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
  const movingIndex = input.teams.findIndex(
    (team) => team.initialPlaceId !== team.agreedPlaceId,
  );
  const destination = input.places.find(
    (place) => place.id === input.teams[movingIndex].agreedPlaceId,
  )!;
  const pointing = ramp(frame, 24, 12, EASE.inOut);
  const handX = mix(pointing, 370, 340 + destination.x * 270);
  const handY = mix(pointing, 485, 160 + destination.y * 280);
  const marker = getTeamMarkerPoseFromInputAndFrame({
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
        color={STOCK.orange}
        role="facilitator"
      />
      <path
        data-community-arm
        d={`M350 485 L${(350 + handX) / 2} ${handY + 24} L${handX} ${handY}`}
        fill="none"
        stroke={STOCK.orange}
        strokeWidth={3}
      />
      <circle
        data-community-hand
        cx={handX}
        cy={handY}
        r={3}
        fill={STOCK.orange}
      />
      <PersonGlyph x={bodyX} y={bodyY} size={36} color={accent} role="worker" />
      <path
        data-team-arm
        d={`M${bodyX} ${bodyY} L${bodyX - 12} ${teamHandY + 12} L${teamHandX} ${teamHandY}`}
        fill="none"
        stroke={accent}
        strokeWidth={3}
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
