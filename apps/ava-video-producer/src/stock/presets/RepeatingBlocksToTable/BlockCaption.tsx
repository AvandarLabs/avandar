import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { STOCK } from "../../stockPalette";
import type { ReactNode } from "react";
type Props = {
  heading: string;
  index: number;
  x: number;
  y: number;
  opacity: number;
  width: number;
  showBlockNumbers: boolean;
  accent: string;
};
/** A readable block heading and optional ordinal stay keyed by their color. */
export function BlockCaption({
  heading,
  index,
  x,
  y,
  opacity,
  width,
  showBlockNumbers,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g opacity={opacity}>
      <path d={`M${x} ${y + 37} h${width}`} stroke={accent} />
      <LabelSlots labels={[[heading, x + 30, y, 190, 12, 3]]} />
      {showBlockNumbers ? (
        <text
          data-block-number={index + 1}
          x={x + 4}
          y={y}
          fill={STOCK.muted}
          fontSize={14}
        >
          {index + 1}
        </text>
      ) : undefined}
    </g>
  );
}
