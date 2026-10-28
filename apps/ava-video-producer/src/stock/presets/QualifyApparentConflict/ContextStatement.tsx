import { EASE, mix, ramp } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import { StatementContext } from "./StatementContext";
import type { Input } from "./QualifyApparentConflict.schema";
import type { ReactNode } from "react";

type Props = {
  frame: number;
  accent: string;
  statement: Input["statements"][number];
  index: number;
  placement: Input["contextPlacement"];
};
/** The unchanged claim moves outward into its own labeled context region. */
export function ContextStatement({
  frame,
  accent,
  statement,
  index,
  placement,
}: Readonly<Props>): ReactNode {
  const arrival = ramp(frame, 12 + index * 6, 18);
  const split = ramp(frame, 48, 36, EASE.inOut);
  const x =
    mix(split, index ? 680 : 280, index ? 710 : 250) +
    mix(arrival, index ? 14 : -14, 0);
  const contextY = placement === "above" ? 145 : 340;
  return (
    <g
      data-statement={statement.id}
      opacity={arrival}
      transform={`translate(${x} 0)`}
    >
      <path
        d="M-180 316 H180"
        fill="none"
        stroke={STOCK.line}
        strokeWidth={2}
      />
      <FitText
        text={statement.claim}
        x={0}
        y={230}
        width={360}
        fontSize={20}
        maxLines={4}
        anchor="middle"
        breakLongWords
        normalizeWhitespace
      />
      <StatementContext {...{ frame, accent, statement, index, contextY }} />
    </g>
  );
}
