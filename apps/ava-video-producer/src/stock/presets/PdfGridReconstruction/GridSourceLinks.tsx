import { getReconstructionColumnXsFromFrame } from "./getReconstructionColumnXsFromFrame";
import type { Input } from "./PdfGridReconstruction.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/** Source row guides bridge the retained page and its emerging table. */
export function GridSourceLinks({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const resultX = getReconstructionColumnXsFromFrame({
    input,
    frame,
    isResult: true,
  })[0];
  return (
    <g>
      {" "}
      {input.showSourceLinks && frame >= 106
        ? input.grid.rows.map((_, rowIndex) => (
            <path
              key={rowIndex}
              data-source-link={rowIndex}
              d={`M452 ${322 + rowIndex * 64} H${resultX}`}
              stroke={accent}
              strokeDasharray="2 4"
              fill="none"
            />
          ))
        : undefined}
    </g>
  );
}
