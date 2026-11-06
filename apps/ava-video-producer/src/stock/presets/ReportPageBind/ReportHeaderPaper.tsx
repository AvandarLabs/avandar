import { mix } from "../../../motion";
import { STOCK } from "../../stockPalette";
import type { ReactNode } from "react";

type Props = { x: number; y: number; margins: number };
/** The upper paper margin meets the first section without a gap. */
export function ReportHeaderPaper({
  x,
  y,
  margins,
}: Readonly<Props>): ReactNode {
  return (
    <rect
      data-header-paper="first-page"
      x={x - 16}
      y={14}
      width={mix(margins, 740, 800)}
      height={y - 22}
      fill={STOCK.surface}
      stroke={STOCK.line}
    />
  );
}
