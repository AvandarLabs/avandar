import { ramp } from "../../../motion";
import { StockRect } from "../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { CleanupCells } from "./CleanupCells";
import { CleanupRowCopy } from "./CleanupRowCopy";
import type { Input } from "./CellNormalization.schema";
import type { ReactNode } from "react";

type Props = {
  row: Input["rows"][number];
  index: number;
  frame: number;
  input: Input;
  accent: string;
};
/** Frames a changed cell takes to cross-fade to its replacement. */
const EDIT_FRAMES = 64;
/** A row's corner before the corner style scales it. */
const ROW_CORNER = 3;
/** Each row remains anchored while only its changed data crossfades. */
export function CleanupRow({
  row,
  index,
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const edit =
    row.before !== row.after
      ? ramp(
          frame,
          40 + index * motion.stagger.list,
          motion.scale(EDIT_FRAMES),
          motion.travel.easing,
        )
      : 0;
  return (
    <g
      data-cleanup-row={row.id}
      transform={`translate(0 ${142 + index * 88})`}
      opacity={motion.reveal(frame, 12 + index * motion.stagger.list)}
    >
      <StockRect
        x={64}
        y={0}
        width={832}
        height={82}
        rx={scales.corner(ROW_CORNER)}
        fill={tokens.color.surface}
        stroke={tokens.color.line}
      />
      <CleanupCells
        row={row}
        edit={edit}
        showWhitespace={input.showWhitespace}
        accent={accent}
      />
      <CleanupRowCopy row={row} input={input} frame={frame} />
    </g>
  );
}
