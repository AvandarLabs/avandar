import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import { CapabilityGlyph } from "./CapabilityGlyph";
import type { Input } from "./CapabilityMatrix.schema";
import type { ReactNode } from "react";

type Props = {
  cell: Input["capabilities"][number]["cells"][number];
  rowId: string;
  label: string;
  x: number;
  y: number;
  width: number;
  showNotes: boolean;
};
/**
 * An explicit mark and optional qualification retain the same semantic state.
 */
export function CapabilityCell({
  cell,
  rowId,
  label,
  x,
  y,
  width,
  showNotes,
}: Readonly<Props>): ReactNode {
  const note = {
    text: cell.note,
    x: x + 48,
    y: y + 17,
    width: width - 64,
    fontSize: 14 as const,
    maxLines: 3,
  };
  return (
    <g
      data-cell={`${rowId}:${cell.optionId}`}
      data-state={cell.state}
      aria-label={label}
    >
      <CapabilityGlyph state={cell.state} x={x + 24} y={y + 30} />
      {showNotes ? (
        <g aria-label={cell.note}>
          <FitText
            {...note}
            breakLongWords
            normalizeWhitespace
            color={STOCK.muted}
          />
        </g>
      ) : null}
    </g>
  );
}
