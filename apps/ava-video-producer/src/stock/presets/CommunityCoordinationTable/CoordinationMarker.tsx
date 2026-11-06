import { propEq } from "@avandar/utils";
import { STOCK } from "../../stockPalette";
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
  const { x, y, moved } = getTeamMarkerPoseFromInputAndFrame({
    input,
    index,
    frame,
  });
  const team = input.teams[index],
    reference = frame >= 108 ? team.agreedPlaceId : team.initialPlaceId;
  const color = getCoordinationPlaceColorFromIndex({
    index: input.places.findIndex(propEq("id", reference)),
    accent,
  });
  return (
    <g
      data-team={input.teams[index].id}
      data-team-moved={moved}
      data-x={x}
      data-y={y}
    >
      {input.markerStyle === "flags" ? (
        <path
          d={`M${x - 6} ${y + 9} V${y - 9} H${x + 7} V${y + 7} H${x - 6}`}
          fill={STOCK.surface}
          stroke={color}
          strokeWidth={2}
        />
      ) : (
        <rect
          x={x - 7}
          y={y - 9}
          width={14}
          height={18}
          rx={4}
          fill={STOCK.surface}
          stroke={color}
          strokeWidth={2}
        />
      )}
      <text
        data-team-key
        x={x}
        y={y + 3}
        fontSize={12}
        textAnchor="middle"
        fill={STOCK.text}
      >
        {index + 1}
      </text>
    </g>
  );
}
