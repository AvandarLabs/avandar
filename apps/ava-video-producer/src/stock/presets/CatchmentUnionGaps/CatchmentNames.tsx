import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { STOCK } from "../../stockPalette";
import type { Input } from "./CatchmentUnionGaps.schema";
import type { ReactNode } from "react";
/** Inputs for CatchmentNames. */
type Props = { input: Input; accent: string };

/** Matched line swatches identify up to four authored service footprints. */
export function CatchmentNames({ input, accent }: Readonly<Props>): ReactNode {
  return (
    <g>
      {input.catchments.map((catchment, index) => (
        <g key={catchment.id}>
          <line
            x1={40 + index * 230}
            y1={78}
            x2={68 + index * 230}
            y2={78}
            stroke={[accent, STOCK.cyan, STOCK.orange, STOCK.mint][index]}
            strokeWidth={3}
            strokeDasharray={["1 0", "6 4", "2 4", "10 3 2 3"][index]}
          />
          <LabelSlots
            labels={[[catchment.label, 40 + index * 230, 97, 210, 12, 3]]}
          />
        </g>
      ))}
    </g>
  );
}
