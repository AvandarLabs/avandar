import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { STOCK } from "../../stockPalette";
import type { Input } from "./InterpretedCaseDialogue.schema";
import type { ReactNode } from "react";

type Props = { input: Input; accent: string };
/**
 * Shared border keys identify original and interpreted wordings in either
 * layout.
 */
export function DialogueLegend({ input, accent }: Readonly<Props>): ReactNode {
  return (
    <g>
      {" "}
      <LabelSlots
        labels={[
          [input.labels.example, 48, 40, 864, 16, 2],
          [input.labels.original, 65, 80, 385, 12, 3],
          [input.labels.interpreted, 527, 80, 385, 12, 3],
        ]}
      />
      <rect x={48} y={70} width={10} height={10} fill="none" stroke={accent} />
      <rect
        x={510}
        y={70}
        width={10}
        height={10}
        fill="none"
        stroke={STOCK.cyan}
      />
    </g>
  );
}
