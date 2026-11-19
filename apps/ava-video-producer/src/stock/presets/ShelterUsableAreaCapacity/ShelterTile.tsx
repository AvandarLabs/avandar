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
  const roleKey = String(
    ["sleeping", "circulation", "storage", "closed"].indexOf(tile.role) + 1,
  );
  return (
    <g>
      {!isSleeping ? (
        <SketchedShape
          shape={{ kind: "path", d: `M${x} ${y + height}v${lift}h82v${-lift}` }}
          profile={tokens.sketch.shape}
          fill={tokens.color.surface}
          stroke={tokens.color.line}
        />
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
        <LabelSlots labels={[[roleKey, x + 32, y + 36, 30, 16, 1]]} />
      ) : undefined}
    </g>
  );
}
