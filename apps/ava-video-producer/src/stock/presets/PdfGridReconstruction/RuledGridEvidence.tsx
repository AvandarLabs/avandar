import { ramp } from "../../../motion";
import type { Input } from "./PdfGridReconstruction.schema";
import type { ReactNode } from "react";
type Props = { input: Input; frame: number; accent: string };
/** Selected structural evidence derives from the supplied grid geometry. */
export function RuledGridEvidence({
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
      {input.signal === "ruling-lines" ? (
        <g>
          {Array.from(
            { length: input.grid.columnLabels.length + 1 },
            (_, index) => (
              <line
                key={`v${index}`}
                data-ruling-line={`v${index}`}
                x1={52 + index * width}
                x2={52 + index * width}
                y1={210}
                y2={210 + height * progress}
                stroke={accent}
              />
            ),
          )}
          {Array.from({ length: input.grid.rows.length + 2 }, (_, index) => (
            <line
              key={`h${index}`}
              data-ruling-line={`h${index}`}
              x1={52}
              x2={52 + 400 * progress}
              y1={index === 0 ? 210 : 290 + (index - 1) * 64}
              y2={index === 0 ? 210 : 290 + (index - 1) * 64}
              stroke={accent}
            />
          ))}
        </g>
      ) : undefined}
    </g>
  );
}
