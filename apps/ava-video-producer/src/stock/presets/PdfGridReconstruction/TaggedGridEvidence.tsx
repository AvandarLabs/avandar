import { ramp } from "../../../motion";
import type { Input } from "./PdfGridReconstruction.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/** Selected structural evidence derives from the supplied grid geometry. */
export function TaggedGridEvidence({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const width = 400 / input.grid.columnLabels.length;
  const height = 80 + input.grid.rows.length * 64;
  const progress = ramp(frame, 13, 42);
  return (
    <g>
      {" "}
      {input.signal === "tagged-cells"
        ? input.grid.rows.flatMap((row, rowIndex) =>
            row.map((_, columnIndex) => (
              <rect
                key={`${rowIndex}:${columnIndex}`}
                data-tagged-outline={`${rowIndex}:${columnIndex}`}
                x={56 + columnIndex * width}
                y={294 + rowIndex * 64}
                width={width - 8}
                height={56}
                fill="none"
                stroke={accent}
                strokeDasharray="3 4"
              />
            )),
          )
        : undefined}
    </g>
  );
}
