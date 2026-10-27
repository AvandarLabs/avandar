import { ramp } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import { SavedRevisionLines } from "./SavedRevisionLines";
import type { Input } from "./RevisionRestore.schema";
import type { ReactNode } from "react";
type Props = {
  revision: Input["revisions"][number];
  index: number;
  frame: number;
  selected: boolean;
  showLabel: boolean;
  accent: string;
};
/** A retained historical impression never moves when a copy is restored. */
export function SavedRevision({
  revision,
  index,
  frame,
  selected,
  showLabel,
  accent,
}: Readonly<Props>): ReactNode {
  const x = 40 + index * 225;
  return (
    <g opacity={ramp(frame, 16 + index * 3, 12)}>
      <rect
        data-history-id={revision.id}
        x={x}
        y={382}
        width={205}
        height={190}
        rx={9}
        fill={STOCK.surface}
        stroke={selected ? accent : STOCK.line}
        strokeWidth={selected ? 2 : 1}
      />
      {showLabel ? (
        <FitText
          text={revision.label}
          x={x + 10}
          y={403}
          width={185}
          maxLines={2}
          fontSize={12}
          normalizeWhitespace
          breakLongWords
          color={selected ? accent : STOCK.text}
        />
      ) : undefined}
      <SavedRevisionLines content={revision.content} x={x} />
    </g>
  );
}
