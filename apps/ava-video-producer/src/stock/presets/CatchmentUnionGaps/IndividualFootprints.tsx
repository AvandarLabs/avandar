import { STOCK } from "../../stockPalette";
import { getCatchmentShapesFromInput } from "./getCatchmentShapesFromInput";
import type { Input } from "./CatchmentUnionGaps.schema";
import type { ReactNode } from "react";

type Props = { input: Input; progress: number; accent: string };
/** Each original service footprint retains its authored outline toggle. */
export function IndividualFootprints({
  input,
  progress,
  accent,
}: Readonly<Props>): ReactNode {
  const shapes = getCatchmentShapesFromInput(input);
  return (
    <g>
      <g data-separate-tint="" opacity={1 - progress}>
        {shapes.map((shape, index) => (
          <polygon
            key={shape.id}
            points={shape.points}
            fill={[accent, STOCK.cyan, STOCK.orange, STOCK.mint][index]}
            fillOpacity={0.25}
          />
        ))}
      </g>
      <g
        data-original-outlines=""
        opacity={input.showOriginalOutlines ? 1 : 1 - progress}
      >
        {shapes.map((shape, index) => (
          <polygon
            key={shape.id}
            points={shape.points}
            fill="none"
            stroke={[accent, STOCK.cyan, STOCK.orange, STOCK.mint][index]}
            strokeWidth={1.4}
            strokeDasharray={["1 0", "6 4", "2 4", "10 3 2 3"][index]}
          />
        ))}
      </g>
    </g>
  );
}
