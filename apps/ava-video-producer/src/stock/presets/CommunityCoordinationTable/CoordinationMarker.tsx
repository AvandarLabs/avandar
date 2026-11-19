import { propEq } from "@avandar/utils";
import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
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
  const motion = useGraphicMotion();
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
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
      {input.markerStyle === "flags" ? (
        <SketchedShape
          shape={{
            kind: "path",
            d: `M${x - 6} ${y + 9} V${y - 9} H${x + 7} V${y + 7} H${x - 6}`,
          }}
          profile={tokens.sketch.shape}
          fill={tokens.color.surface}
          stroke={color}
          strokeWidth={scales.stroke(tokens.stroke.default)}
        />
      ) : (
        <StockRect
          x={x - 7}
          y={y - 9}
          width={14}
          height={18}
          rx={scales.corner(tokens.corner.chip)}
          fill={tokens.color.surface}
          stroke={color}
          strokeWidth={scales.stroke(tokens.stroke.default)}
        />
      )}
      <text
        data-team-key
        x={x}
        y={y + 3}
        fontFamily={tokens.text.graphic.data.fontFamily}
        fontSize={tokens.text.graphic.data.fontSize}
        textAnchor="middle"
        fill={tokens.color.text}
      >
        {index + 1}
      </text>
    </g>
  );
}
