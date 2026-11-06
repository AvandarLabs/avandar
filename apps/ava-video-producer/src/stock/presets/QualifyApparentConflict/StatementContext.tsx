import { ramp } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import type { Input } from "./QualifyApparentConflict.schema";
import type { ReactNode } from "react";
/** Inputs for StatementContext. */
type Props = {
  frame: number;
  accent: string;
  statement: Input["statements"][number];
  index: number;
  contextY: number;
};

/** One original claim receives its own authored context label. */
export function StatementContext({
  frame,
  accent,
  statement,
  index,
  contextY,
}: Readonly<Props>): ReactNode {
  return (
    <>
      <g
        {...{ [`data-context-${index}`]: true }}
        data-y={contextY}
        opacity={ramp(frame, 60 + index * 4, 24)}
      >
        <FitText
          text={statement.context}
          x={0}
          y={contextY}
          width={360}
          fontSize={16}
          maxLines={3}
          anchor="middle"
          color={index ? STOCK.mint : accent}
          breakLongWords
          normalizeWhitespace
        />
      </g>
    </>
  );
}
