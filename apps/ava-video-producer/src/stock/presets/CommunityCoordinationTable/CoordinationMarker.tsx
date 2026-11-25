import { propEq } from "@avandar/utils";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { CoordinationMarkerShape } from "./CoordinationMarkerShape/CoordinationMarkerShape";
import { CoordinationTeamOrdinal } from "./CoordinationTeamOrdinal/CoordinationTeamOrdinal";
import { getCoordinationPlaceColorFromIndex } from "./getCoordinationPlaceColorFromIndex";
import { getTeamMarkerPoseFromInputAndFrame } from "./getTeamMarkerPoseFromInputAndFrame";
import type { Input } from "./CommunityCoordinationTable.schema";
import type { ReactNode } from "react";

type Props = { input: Input; index: number; frame: number; accent: string };
/** Physical team tokens retain individual slots even at a shared assignment. */
export function CoordinationMarker({
  input,
  index,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const motion = GraphicThemeHooks.useGraphicMotion();
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const { x, y, moved } = getTeamMarkerPoseFromInputAndFrame({
    motion,
    input,
    index,
    frame,
  });
  const team = input.teams[index],
    reference = frame >= 108 ? team.agreedPlaceId : team.initialPlaceId;
  const color = getCoordinationPlaceColorFromIndex({
    index: input.places.findIndex(propEq("id", reference)),
    accent,
    color: tokens.color,
  });
  return (
    <g
      data-team={input.teams[index].id}
      data-team-moved={moved}
      data-x={x}
      data-y={y}
    >
      <CoordinationMarkerShape {...{ input, x, y, tokens, color, scales }} />
      <CoordinationTeamOrdinal {...{ index, tokens, x, y }} />
    </g>
  );
}
