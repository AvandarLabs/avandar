import { type Props } from "./CellNormalizationShared/CellNormalizationShared.types";
import { CleanupHeadings } from "./CleanupHeadings";
import { CleanupRow } from "./CleanupRow";
import { OriginalValueRail } from "./OriginalValueRail";
import type { ReactNode } from "react";
/** Replace authored changed cells and retain the exact original-value rail. */
export function CellNormalization({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <CleanupHeadings input={input} frame={frame} accent={accent} />
      <OriginalValueRail frame={frame} input={input} accent={accent} />
      {input.rows.map((row, index) => {
        return (
          <CleanupRow
            key={row.id}
            row={row}
            index={index}
            frame={frame}
            input={input}
            accent={accent}
          />
        );
      })}
    </g>
  );
}
