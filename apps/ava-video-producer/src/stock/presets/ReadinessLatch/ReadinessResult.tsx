import { EASE, mix, ramp } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import type { Input } from "./ReadinessLatch.schema";
import type { ReactNode } from "react";
type Props = {
  horizontal: boolean;
  allReady: boolean;
  frame: number;
  accent: string;
  input: Input;
};
const LABEL = {
  width: 204,
  fontSize: 12 as const,
  maxLines: 3,
  breakLongWords: true,
  normalizeWhitespace: true,
} satisfies Pick<
  Parameters<typeof FitText>[0],
  "width" | "fontSize" | "maxLines" | "breakLongWords" | "normalizeWhitespace"
>;
/**
 * The complete labeled result waits upstream and passes through a clear gap.
 */
export function ReadinessResult({
  horizontal,
  allReady,
  frame,
  accent,
  input,
}: Readonly<Props>): ReactNode {
  const release = allReady ? ramp(frame, 130, 16, EASE.inOut) : 0;
  const centerX = horizontal ? mix(release, 500, 800) : 150;
  const centerY = horizontal ? 500 : mix(release, 350, 485);
  const panel = {
    x: centerX - 124,
    y: centerY - 32,
    width: 248,
    height: 64,
    rx: 8,
    fill: STOCK.surface,
    stroke: accent,
    strokeWidth: 2,
  };
  const label = { text: input.sharedAction, x: centerX - 88, y: centerY - 16 };
  return (
    <g opacity={ramp(frame, 22, 12)}>
      <rect data-result="single" {...panel} />
      <circle cx={centerX - 108} cy={centerY} r={8} fill={accent} />
      {input.showLabels ? <FitText {...LABEL} {...label} /> : undefined}
    </g>
  );
}
