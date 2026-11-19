import { propEq } from "@avandar/utils";
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
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
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
      <StockRect
        x={634}
        y={y - 14}
        width={16}
        height={18}
        rx={
          input.markerStyle === "flags" ? 0 : scales.corner(tokens.corner.chip)
        }
        fill={tokens.color.surface}
        stroke={color}
      />
      <text
        data-team-legend-key
        x={642}
        y={y}
        textAnchor="middle"
        fontFamily={tokens.text.graphic.data.fontFamily}
        fontSize={tokens.text.graphic.data.fontSize}
        fill={tokens.color.text}
      >
        {index + 1}
      </text>
      <SketchedShape
        shape={{
          kind: "path",
          d: `M642 ${y + 9} V${y + 23} l-3 -4 m3 4 l3 -4`,
        }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={color}
      />
      <SketchedShape
        shape={{ kind: "circle", cx: 642, cy: y + 43, r: 9 }}
        profile={tokens.sketch.shape}
        fill={tokens.color.surface}
        stroke={color}
      />
      <text
        data-assignment-key
        x={642}
        y={y + 47}
        textAnchor="middle"
        fontFamily={tokens.text.graphic.data.fontFamily}
        fontSize={tokens.text.graphic.data.fontSize}
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
