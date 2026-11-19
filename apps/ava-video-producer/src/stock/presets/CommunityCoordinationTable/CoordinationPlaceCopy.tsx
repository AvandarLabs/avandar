import { FitText } from "../../primitives/FitText/FitText";
import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
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
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  const color = getCoordinationPlaceColorFromIndex({ index, accent });
  const y = 120 + 108 * index;
  return (
    <g data-request={place.id} data-request-face={frame >= 108 ? "up" : "edge"}>
      <SketchedShape
        shape={{ kind: "circle", cx: 25, cy: y - 4, r: 9 }}
        profile={tokens.sketch.shape}
        fill={tokens.color.surface}
        stroke={color}
      />
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
      <StockRect
        data-request-card={place.id}
        x={36}
        y={158 + 108 * index}
        width={284}
        height={54}
        rx={scales.corner(tokens.corner.chip)}
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
