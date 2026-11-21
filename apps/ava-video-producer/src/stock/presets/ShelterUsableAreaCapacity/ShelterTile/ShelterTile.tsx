import { LabelSlots } from "../../../primitives/LabelSlots/LabelSlots";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { StockRect } from "../../../primitives/StockRect";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { getFloorTileGeometryFromInputAndFrame } from "../getFloorTileGeometryFromInputAndFrame";
import { CutawayLip } from "./CutawayLip";
import type { Input } from "../ShelterUsableAreaCapacity.schema";
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
  const motion = GraphicThemeHooks.useGraphicMotion();
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const { x, y, width, height, lift, isSleeping } =
    getFloorTileGeometryFromInputAndFrame({ input, tile, frame, motion });
  const roles = ["sleeping", "circulation", "storage", "closed"];
  const roleNumber = String(roles.indexOf(tile.role) + 1);
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
        <LabelSlots labels={[[roleNumber, x + 32, y + 36, 30, 16, 1]]} />
      ) : undefined}
    </g>
  );
}
