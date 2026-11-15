import { ramp } from "../../../motion";
import { STOCK } from "../../stockPalette";
import type { Input } from "./PdfGridReconstruction.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/** Selected structural evidence derives from the supplied grid geometry. */
export function WhitespaceGridEvidence({
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
      {input.signal === "whitespace" ? (
        <g>
          {Array.from(
            { length: input.grid.columnLabels.length - 1 },
            (_, index) => (
              <rect
                key={`v${index}`}
                data-whitespace-corridor={`v${index}`}
                x={48 + (index + 1) * width}
                y={210}
                width={8}
                height={height * progress}
                fill={STOCK.orange}
                fillOpacity={0.25}
              />
            ),
          )}
          {Array.from({ length: input.grid.rows.length }, (_, index) => (
            <rect
              key={`h${index}`}
              data-whitespace-corridor={`h${index}`}
              x={52}
              y={286 + index * 64}
              width={400 * progress}
              height={8}
              fill={STOCK.orange}
              fillOpacity={0.25}
            />
          ))}
        </g>
      ) : undefined}
    </g>
  );
}
