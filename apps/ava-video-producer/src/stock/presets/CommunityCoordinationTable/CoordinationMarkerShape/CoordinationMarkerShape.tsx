import { SketchedShape } from "../../../primitives/SketchedShape";
import { StockRect } from "../../../primitives/StockRect";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../CommunityCoordinationTable.schema";
import type { getCoordinationPlaceColorFromIndex } from "../getCoordinationPlaceColorFromIndex";
import type { getTeamMarkerPoseFromInputAndFrame } from "../getTeamMarkerPoseFromInputAndFrame";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  x: ReturnType<typeof getTeamMarkerPoseFromInputAndFrame>["x"];
  y: ReturnType<typeof getTeamMarkerPoseFromInputAndFrame>["y"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  color: ReturnType<typeof getCoordinationPlaceColorFromIndex>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
};

/** Renders the outline with authored geometry. */
export function CoordinationMarkerShape({
  input,
  x,
  y,
  tokens,
  color,
  scales,
}: Readonly<Props>): ReactNode {
  return (
    <>
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
    </>
  );
}
