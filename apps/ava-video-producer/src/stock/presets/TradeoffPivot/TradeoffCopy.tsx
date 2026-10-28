import { ramp } from "../../../motion";
import { DrawPath } from "../../graphics-common";
import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import type { Input } from "./TradeoffPivot.schema";
import type { ReactNode } from "react";
type Props = { frame: number; input: Input; accent: string };
/** The authored priority appears only after both sides can be read together. */
export function TradeoffCopy({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const labels = [
    {
      text: input.approach,
      y: 60,
      fontSize: 24 as const,
      color: STOCK.text,
      opacity: ramp(frame, 12, 18),
    },
    {
      text: input.priorityStatement,
      y: 548,
      fontSize: 18 as const,
      color: STOCK.muted,
      opacity: ramp(frame, 108, 12),
    },
  ];
  return (
    <g>
      {labels.map(({ opacity, ...label }, index) => (
        <g key={index} opacity={opacity} aria-label={label.text}>
          <FitText
            {...label}
            x={480}
            width={840}
            maxLines={2}
            breakLongWords
            normalizeWhitespace
            anchor="middle"
          />
        </g>
      ))}
      <DrawPath
        d="M330 520 H630"
        frame={frame}
        at={108}
        duration={12}
        color={accent}
      />
    </g>
  );
}
