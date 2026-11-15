import { propEq } from "@avandar/utils";
import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
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
  const team = input.teams[index],
    reference = frame >= 108 ? team.agreedPlaceId : team.initialPlaceId;
  const placeIndex = input.places.findIndex(propEq("id", reference)),
    color = getCoordinationPlaceColorFromIndex({ index: placeIndex, accent });
  const y = 130 + 100 * index;
  return (
    <g data-team-legend={team.id} data-assignment-place={reference}>
      <rect
        x={634}
        y={y - 14}
        width={16}
        height={18}
        rx={input.markerStyle === "flags" ? 0 : 4}
        fill={STOCK.surface}
        stroke={color}
      />
      <text
        data-team-legend-key
        x={642}
        y={y}
        textAnchor="middle"
        fontSize={12}
        fill={STOCK.text}
      >
        {index + 1}
      </text>
      <path
        d={`M642 ${y + 9} V${y + 23} l-3 -4 m3 4 l3 -4`}
        fill="none"
        stroke={color}
      />
      <circle cx={642} cy={y + 43} r={9} fill={STOCK.surface} stroke={color} />
      <text
        data-assignment-key
        x={642}
        y={y + 47}
        textAnchor="middle"
        fontSize={12}
        fill={color}
      >
        {String.fromCharCode(65 + placeIndex)}
      </text>
      <FitText
        text={team.label}
        x={660}
        y={y}
        width={260}
        fontSize={12}
        maxLines={3}
        breakLongWords
        normalizeWhitespace
      />
      <FitText
        text={team.serviceLabel}
        x={660}
        y={y + 47}
        width={260}
        fontSize={12}
        maxLines={3}
        breakLongWords
        normalizeWhitespace
      />
    </g>
  );
}
