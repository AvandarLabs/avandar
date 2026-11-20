import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { buildFloorOutlineFromTiles } from "./buildFloorOutlineFromTiles";
import { ShelterTile } from "./ShelterTile/ShelterTile";
import type { Input } from "./ShelterUsableAreaCapacity.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/** The gross perimeter remains around the cutaway while usable tiles unroll. */
export function ShelterFloor({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <g>
      {input.keepGrossOutline || frame < 36 ? (
        <g data-gross-outline="">
          <SketchedShape
            shape={{
              kind: "path",
              d: buildFloorOutlineFromTiles(input.floorTiles),
            }}
            profile={tokens.sketch.shape}
            fill="none"
            stroke={tokens.color.text}
            strokeWidth={scales.stroke(tokens.stroke.default)}
          />
        </g>
      ) : undefined}
      {input.floorTiles.map((tile) => {
        return (
          <ShelterTile
            key={tile.id}
            input={input}
            tile={tile}
            frame={frame}
            accent={accent}
          />
        );
      })}
    </g>
  );
}
