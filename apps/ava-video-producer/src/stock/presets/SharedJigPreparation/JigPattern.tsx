import { STOCK } from "../../stockPalette";
import type { Input } from "./SharedJigPreparation.schema";
import type { ReactNode } from "react";

type Props = {
  x: number;
  y: number;
  pattern: Input["guide"]["pattern"];
  progress?: number;
  isGuide?: boolean;
  color: string;
};
/** The selected categorical pattern cuts the guide or marks its workpiece. */
export function JigPattern({
  x,
  y,
  pattern,
  progress = 1,
  isGuide = false,
  color,
}: Readonly<Props>): ReactNode {
  const radius = 7 * progress;
  const body = `M${x} ${y} h100 v64 h-100 Z`;
  const holes = [30, 70]
    .map(
      (offset) =>
        `M${x + offset - radius} ${y + 32} a${radius} ${radius} 0 1 0 ${radius * 2} 0 a${radius} ${radius} 0 1 0 ${-radius * 2} 0`,
    )
    .join(" ");
  const notch = `M${x} ${y} h${22 * progress} v${22 * progress} h${-22 * progress} Z`;
  return (
    <g>
      {isGuide ? (
        <path
          data-guide-body="true"
          d={`${body} ${pattern === "two-holes" ? holes : notch}`}
          fillRule="evenodd"
          fill={STOCK.elevated}
          stroke={color}
          strokeWidth={2}
        />
      ) : undefined}
      {pattern === "two-holes" ? (
        [30, 70].map((offset) => (
          <circle
            key={offset}
            data-hole-mark="true"
            cx={x + offset}
            cy={y + 32}
            r={radius}
            fill={isGuide ? "none" : color}
            stroke={color}
          />
        ))
      ) : (
        <path
          data-corner-mark="true"
          d={`M${x} ${y + 22 * progress} h${22 * progress} v${-22 * progress}`}
          fill="none"
          stroke={color}
          strokeWidth={3}
        />
      )}
    </g>
  );
}
