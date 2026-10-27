import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { STOCK } from "../../stockPalette";
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
  const { x, y, width, height, lift, isSleeping } =
    getFloorTileGeometryFromInputAndFrame({
      input,
      tile,
      frame,
    });
  const roleKey = String(
    ["sleeping", "circulation", "storage", "closed"].indexOf(tile.role) + 1,
  );
  return (
    <g>
      {!isSleeping ? (
        <path
          d={`M${x} ${y + height}v${lift}h82v${-lift}`}
          fill={STOCK.surface}
          stroke={STOCK.line}
        />
      ) : undefined}
      <rect
        data-floor-tile={tile.id}
        data-role={tile.role}
        data-usable-area={isSleeping ? input.areaPerTile : 0}
        x={x}
        y={y}
        width={width}
        height={height}
        fill={isSleeping ? accent : STOCK.surface}
        fillOpacity={isSleeping ? 0.4 : 1}
        stroke={isSleeping ? accent : STOCK.orange}
      />
      {!isSleeping ? (
        <LabelSlots labels={[[roleKey, x + 32, y + 36, 30, 16, 1]]} />
      ) : undefined}
    </g>
  );
}
