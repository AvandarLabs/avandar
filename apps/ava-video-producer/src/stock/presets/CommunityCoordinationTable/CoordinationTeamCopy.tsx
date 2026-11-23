import { propEq } from "@avandar/utils";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { CoordinationAssignmentConnector } from "./CoordinationAssignmentConnector/CoordinationAssignmentConnector";
import { CoordinationTeamCopyAssignmentKey } from "./CoordinationTeamCopyAssignmentKey/CoordinationTeamCopyAssignmentKey";
import { CoordinationTeamCopyTeamLegendKey } from "./CoordinationTeamCopyTeamLegendKey/CoordinationTeamCopyTeamLegendKey";
import { CoordinationTeamLegendMarker } from "./CoordinationTeamLegendMarker/CoordinationTeamLegendMarker";
import { CoordinationTeamName } from "./CoordinationTeamName/CoordinationTeamName";
import { CoordinationTeamServiceLabel } from "./CoordinationTeamServiceLabel/CoordinationTeamServiceLabel";
import { getCoordinationPlaceColorFromIndex } from "./getCoordinationPlaceColorFromIndex";
import type { Input } from "./CommunityCoordinationTable.schema";
import type { ReactNode } from "react";

type Props = { input: Input; index: number; frame: number; accent: string };
/**
 * A token number and destination letter make each named team's assignment
 * explicit.
 */
export function CoordinationTeamCopy({
  input,
  index,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const team = input.teams[index],
    reference = frame >= 108 ? team.agreedPlaceId : team.initialPlaceId;
  const placeIndex = input.places.findIndex(propEq("id", reference)),
    color = getCoordinationPlaceColorFromIndex({
      index: placeIndex,
      accent,
      color: tokens.color,
    });
  const y = 130 + 100 * index;
  return (
    <g data-team-legend={team.id} data-assignment-place={reference}>
      <CoordinationTeamLegendMarker {...{ y, input, scales, tokens, color }} />
      <CoordinationTeamCopyTeamLegendKey {...{ y, tokens, index }} />
      <CoordinationAssignmentConnector {...{ tokens, color, y }} />
      <CoordinationTeamCopyAssignmentKey
        {...{ y, tokens, color, placeIndex }}
      />
      <CoordinationTeamName team={team} y={y} />
      <CoordinationTeamServiceLabel team={team} y={y} />
    </g>
  );
}
