import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { GridCell } from "../GridCell";
import { makeGridSceneFromInputAndFrame } from "../makeGridSceneFromInputAndFrame";
import { CellShade } from "./CellShade";
import type { Input } from "../SpatialGridBinning.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/** Square source bins and a separate count-token ledger. */
export function GridCells({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const motion = GraphicThemeHooks.useGraphicMotion();
  const { cells } = makeGridSceneFromInputAndFrame({ input, frame, motion });
  return (
    <g>
      {cells.map((cell) => {
        return (
          <g key={cell.index}>
            <CellShade
              input={input}
              cell={cell}
              frame={frame}
              accent={accent}
            />
            <GridCell input={input} cell={cell} frame={frame} />
          </g>
        );
      })}
    </g>
  );
}
