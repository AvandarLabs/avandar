import { ramp } from "../../../motion";
import { CleanupHeadings } from "./CleanupHeadings";
import { CleanupRow } from "./CleanupRow";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./CellNormalization.schema";
import type { ReactNode } from "react";
/** Complete cleanup props. The shared renderer owns the loop envelope. */
export type Props = GraphicProps & { input: Input };
/** Replace authored changed cells and retain the exact original-value rail. */
export function CellNormalization({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <CleanupHeadings input={input} frame={frame} accent={accent} />
      <g data-original-rail={input.comparison} opacity={ramp(frame, 60, 52)}>
        <path
          d={input.comparison === "side-rail" ? "M496 132V584" : "M64 132H896"}
          stroke={accent}
          strokeWidth={1}
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - ramp(frame, 60, 52)}
        />
      </g>
      {input.rows.map((row, index) => (
        <CleanupRow
          key={row.id}
          row={row}
          index={index}
          frame={frame}
          input={input}
          accent={accent}
        />
      ))}
    </g>
  );
}
