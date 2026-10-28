import { ramp } from "../../../motion";
import { STOCK } from "../../stockPalette";
import { makeDetailSimplificationFromInput } from "./makeDetailSimplificationFromInput";
import type { Input } from "./GeometryDetailBudget.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number };
/** Each removed point is paired with its own finite retained segment. */
export function RemovedDeviationGuides({
  input,
  frame,
}: Readonly<Props>): ReactNode {
  const { removed } = makeDetailSimplificationFromInput(input);
  return (
    <g>
      {removed.map((item) => (
        <line
          key={item.index}
          data-removed-index={item.index}
          data-distance={item.distance}
          x1={60 + input.vertices[item.index][0] * 3.6}
          y1={160 + input.vertices[item.index][1] * 3.6}
          x2={60 + item.projection[0] * 3.6}
          y2={160 + item.projection[1] * 3.6}
          stroke={STOCK.orange}
          strokeDasharray="3 3"
          opacity={ramp(frame, 111, 28)}
        />
      ))}
    </g>
  );
}
