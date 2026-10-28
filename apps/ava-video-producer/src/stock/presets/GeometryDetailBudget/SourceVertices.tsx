import { mixToken, ramp } from "../../../motion";
import { STOCK } from "../../stockPalette";
import { makeDetailSimplificationFromInput } from "./makeDetailSimplificationFromInput";
import type { Input } from "./GeometryDetailBudget.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/**
 * All source vertices stay fixed, including removed and backtracking vertices.
 */
export function SourceVertices({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const { keptIndices } = makeDetailSimplificationFromInput(input);
  const kept = new Set(keptIndices);
  return (
    <g>
      {input.vertices.map(([x, y], index) => (
        <circle
          key={index}
          data-source-vertex={index}
          data-kept-index={kept.has(index) ? index : undefined}
          cx={60 + x * 3.6}
          cy={160 + y * 3.6}
          r={5}
          fill={
            kept.has(index)
              ? mixToken(ramp(frame, 111, 28), STOCK.muted, accent)
              : STOCK.muted
          }
          opacity={ramp(frame, 13 + index * 2, 23)}
        />
      ))}
    </g>
  );
}
