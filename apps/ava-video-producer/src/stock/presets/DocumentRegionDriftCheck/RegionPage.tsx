import { EASE, mix, ramp } from "../../../motion";
import { STOCK } from "../../stockPalette";
import type { Input } from "./DocumentRegionDriftCheck.schema";
import type { ReactNode } from "react";
type Props = {
  input: Input;
  frame: number;
  accent: string;
  side: "saved" | "current";
};
/** Page outlines retain the exact normalized region without label clamping. */
export function RegionPage({
  input,
  frame,
  accent,
  side,
}: Readonly<Props>): ReactNode {
  const progress = ramp(frame, 13, 37, EASE.inOut),
    x = side === "saved" ? 52 : mix(progress, 608, 508),
    y = side === "saved" ? 180 : mix(progress, 196, 180);
  const [left, top, right, bottom] = input.saved.box;
  return (
    <g>
      <rect
        data-page-outline={side}
        x={x}
        y={y}
        width={300}
        height={200}
        fill={STOCK.surface}
        stroke={STOCK.line}
      />
      {[0, 1, 2, 3].map((index) => (
        <path
          key={index}
          d={`M${x + 18} ${y + 26 + index * 34} h264`}
          stroke={STOCK.line}
          strokeOpacity={0.4}
        />
      ))}
      <rect
        data-saved-region={side}
        data-page={input.saved.page}
        x={x + left * 3}
        y={y + top * 2}
        width={(right - left) * 3}
        height={(bottom - top) * 2}
        fill={accent}
        fillOpacity={0.08}
        stroke={accent}
        strokeWidth={1.5}
      />
    </g>
  );
}
