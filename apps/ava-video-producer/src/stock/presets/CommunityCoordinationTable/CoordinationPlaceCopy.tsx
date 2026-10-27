import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import { getCoordinationPlaceColorFromIndex } from "./getCoordinationPlaceColorFromIndex";
import type { Input } from "./CommunityCoordinationTable.schema";
import type { ReactNode } from "react";
type Props = {
  place: Input["places"][number];
  index: number;
  frame: number;
  accent: string;
};
/** A keyed request card has a visible connector to its actual map location. */
export function CoordinationPlaceCopy({
  place,
  index,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const color = getCoordinationPlaceColorFromIndex({ index, accent });
  const y = 120 + 108 * index;
  return (
    <g data-request={place.id} data-request-face={frame >= 108 ? "up" : "edge"}>
      <circle cx={25} cy={y - 4} r={9} fill={STOCK.surface} stroke={color} />
      <text
        data-place-key={place.id}
        x={25}
        y={y}
        textAnchor="middle"
        fontSize={12}
        fill={color}
      >
        {String.fromCharCode(65 + index)}
      </text>
      <FitText
        text={place.label}
        x={40}
        y={y}
        width={280}
        fontSize={12}
        maxLines={3}
        breakLongWords
        normalizeWhitespace
      />
      <rect
        data-request-card={place.id}
        x={36}
        y={158 + 108 * index}
        width={284}
        height={54}
        rx={4}
        fill="none"
        stroke={color}
        strokeOpacity={frame >= 108 ? 0.8 : 0.3}
      />
      <FitText
        text={place.requestLabel}
        x={40}
        y={174 + 108 * index}
        width={280}
        fontSize={12}
        maxLines={3}
        breakLongWords
        normalizeWhitespace
      />
    </g>
  );
}
