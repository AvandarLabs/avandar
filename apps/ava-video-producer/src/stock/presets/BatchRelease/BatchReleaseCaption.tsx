import { ramp } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import type { ReactNode } from "react";
type Props = {
  frame: number;
  completeAt: number;
  x: number;
  y: number;
  text: string;
};
/** The completion caption follows its own released envelope. */
export function BatchReleaseCaption({
  frame,
  completeAt,
  x,
  y,
  text,
}: Readonly<Props>): ReactNode {
  return (
    <g opacity={ramp(frame, completeAt, 8)}>
      <FitText
        text={text}
        x={x + 15}
        y={y + 154}
        width={330}
        fontSize={14}
        maxLines={2}
        normalizeWhitespace
        breakLongWords
        color={STOCK.muted}
      />
    </g>
  );
}
