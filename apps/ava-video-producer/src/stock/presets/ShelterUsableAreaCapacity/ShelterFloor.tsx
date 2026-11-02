import { STOCK } from "../../stockPalette";
import { buildFloorOutlineFromTiles } from "./buildFloorOutlineFromTiles";
import { ShelterTile } from "./ShelterTile";
import type { Input } from "./ShelterUsableAreaCapacity.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/** The gross perimeter remains around the cutaway while usable tiles unroll. */
export function ShelterFloor({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      {input.keepGrossOutline || frame < 36 ? (
        <path
          data-gross-outline=""
          d={buildFloorOutlineFromTiles(input.floorTiles)}
          fill="none"
          stroke={STOCK.text}
          strokeWidth={2}
        />
      ) : undefined}
      {input.floorTiles.map((tile) => (
        <ShelterTile
          key={tile.id}
          input={input}
          tile={tile}
          frame={frame}
          accent={accent}
        />
      ))}
    </g>
  );
}
