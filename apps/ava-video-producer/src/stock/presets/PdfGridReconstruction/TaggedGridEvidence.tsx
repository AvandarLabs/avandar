import { StockRect } from "../../primitives/StockRect/StockRect";
import type { Input } from "./PdfGridReconstruction.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };

/** The dash of a tagged cell outline. */
const TAG_DASH = "3 4";
/** Selected structural evidence derives from the supplied grid geometry. */
export function TaggedGridEvidence({
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const width = 400 / input.grid.columnLabels.length;
  return (
    <g>
      {" "}
      {input.signal === "tagged-cells"
        ? input.grid.rows.flatMap((row, rowIndex) => {
            return row.map((_, columnIndex) => {
              return (
                <StockRect
                  key={`${rowIndex}:${columnIndex}`}
                  data-tagged-outline={`${rowIndex}:${columnIndex}`}
                  x={56 + columnIndex * width}
                  y={294 + rowIndex * 64}
                  width={width - 8}
                  height={56}
                  fill="none"
                  stroke={accent}
                  strokeDasharray={TAG_DASH}
                />
              );
            });
          })
        : undefined}
    </g>
  );
}
