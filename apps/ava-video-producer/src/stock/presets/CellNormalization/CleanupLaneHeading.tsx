import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import type { ReactNode } from "react";

type Props = {
  text: string;
  labelRole: "original" | "result" | "change";
  placement: "primary" | "retained" | "edit";
  x: number;
  y: number;
  opacity?: number;
  color?: string;
  fontSize?: 12 | 14;
};
/** A supplied label stays attached to the value lane it actually describes. */
export function CleanupLaneHeading({
  text,
  labelRole,
  placement,
  x,
  y,
  opacity = 1,
  color = STOCK.muted,
  fontSize = 14,
}: Readonly<Props>): ReactNode {
  return (
    <g
      data-cleanup-label={labelRole}
      data-label-placement={placement}
      opacity={opacity}
    >
      <FitText
        text={text}
        x={x}
        y={y}
        width={352}
        fontSize={fontSize}
        maxLines={1}
        breakLongWords
        normalizeWhitespace
        color={color}
      />
    </g>
  );
}
