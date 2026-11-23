import { propEq } from "@avandar/utils";
import { Motion } from "../../../motion";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { CoordinationRepresentative } from "./CoordinationRepresentative/CoordinationRepresentative";
import { CoordinationTokenHandler } from "./CoordinationTokenHandler/CoordinationTokenHandler";
import { getTeamMarkerPoseFromInputAndFrame } from "./getTeamMarkerPoseFromInputAndFrame";
import type { Input } from "./CommunityCoordinationTable.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  frame: number;
  accent: string;
};
/** Locates the moving team and the representative's authored pointing hand. */
function _getRepresentativeHandPose({
  input,
  frame,
  motion,
}: Readonly<
  Pick<Props, "input" | "frame"> & {
    motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
  }
>): { movingIndex: number; handX: number; handY: number } {
  const movingIndex = input.teams.findIndex((team) => {
    return team.initialPlaceId !== team.agreedPlaceId;
  });
  const destination = input.places.find(
    propEq("id", input.teams[movingIndex].agreedPlaceId),
  )!;
  const pointing = motion.ramp(
    frame,
    24,
    motion.scale(12),
    motion.travel.easing,
  );
  const handX = Motion.mix({
    t: pointing,
    from: 370,
    to: 340 + destination.x * 270,
  });
  const handY = Motion.mix({
    t: pointing,
    from: 485,
    to: 160 + destination.y * 280,
  });
  return { movingIndex, handX, handY };
}

/**
 * A representative indicates the destination and the team handles its token.
 */
export function CoordinationActors({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const { movingIndex, handX, handY } = _getRepresentativeHandPose({
    input,
    frame,
    motion,
  });
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
      <CoordinationRepresentative {...{ tokens, scales, handX, handY }} />
      <CoordinationTokenHandler
        {...{ accent, tokens, scales, bodyX, bodyY, teamHandX }}
        teamHandY={teamHandY}
      />
    </g>
  );
}
