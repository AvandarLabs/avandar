import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicTokens,
  useGraphicMotion,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { getFloorTileGeometryFromInputAndFrame } from "./getFloorTileGeometryFromInputAndFrame";
import type { Input } from "./ShelterUsableAreaCapacity.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  tile: Input["floorTiles"][number];
  frame: number;
  accent: string;
};
/** A shallow raised cutaway exposes every excluded role without usable area. */
export function ShelterTile({
  input,
  tile,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const motion = useGraphicMotion();
  const tokens = useGraphicTokens();
  const { x, y, width, height, lift, isSleeping } =
    getFloorTileGeometryFromInputAndFrame({
      input,
      tile,
      frame,
      motion,
    });
  return (
    <g>
      {!isSleeping ? (
        <CutawayLip x={x} y={y + height} lift={lift} />
      ) : undefined}
      <StockRect
        data-floor-tile={tile.id}
        data-role={tile.role}
        data-usable-area={isSleeping ? input.areaPerTile : 0}
        x={x}
        y={y}
        width={width}
        height={height}
        fill={isSleeping ? accent : tokens.color.surface}
        fillOpacity={isSleeping ? tokens.alpha.dimmed : 1}
        stroke={isSleeping ? accent : tokens.color.highlight}
      />
      {!isSleeping ? (
        <LabelSlots
          labels={[
            [_buildRoleKeyFromRole(tile.role), x + 32, y + 36, 30, 16, 1],
          ]}
        />
      ) : undefined}
    </g>
  );
}

/** A role's number in the legend's order. */
function _buildRoleKeyFromRole(role: Props["tile"]["role"]): string {
  return String(
    ["sleeping", "circulation", "storage", "closed"].indexOf(role) + 1,
  );
}

/** The raised edge that exposes an excluded tile. */
function CutawayLip({
  x,
  y,
  lift,
}: Readonly<{ x: number; y: number; lift: number }>): ReactNode {
  const tokens = useGraphicTokens();
  return (
    <SketchedShape
      shape={{ kind: "path", d: `M${x} ${y}v${lift}h82v${-lift}` }}
      profile={tokens.sketch.shape}
      fill={tokens.color.surface}
      stroke={tokens.color.line}
    />
  );
}
