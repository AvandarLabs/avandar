import { STOCK } from "../../graphics-common";
import type { ReactNode } from "react";

type Props = {
  kind: keyof typeof OBJECT_PATHS;
  x: number;
  y: number;
  size?: number;
  color?: string;
};
const OBJECT_PATHS: Record<
  "document" | "box" | "resource" | "tool" | "building" | "device" | "token",
  string
> = {
  document:
    "M-15 -21 H7 L17 -11 V21 H-15 Z M7 -21 V-11 H17 M-8 -3 H9 M-8 5 H9 M-8 13 H4",
  box: "M0 -20 L21 -9 V12 L0 23 L-21 12 V-9 Z M-21 -9 L0 2 L21 -9 M0 2 V23 M-10 -15 L11 -4",
  resource:
    "M-18 -14 H18 V18 H-18 Z M-11 -14 V-21 H11 V-14 M-8 -2 H8 M0 -10 V6",
  tool: "M-8 -19 L-2 -13 L6 -21 L15 -18 L18 -10 L10 -2 L3 -3 L-14 20 L-21 14 L-4 -6 L-8 -12 Z",
  building:
    "M-22 -5 L0 -22 L22 -5 Z M-18 -5 V21 H18 V-5 M-10 0 V15 M0 0 V15 M10 0 V15 M-23 21 H23",
  device:
    "M-22 -17 H22 V12 H-22 Z M-10 22 H10 M0 12 V22 M-17 -12 H17 V7 H-17 Z",
  token: "M0 -22 L19 -11 V11 L0 22 L-19 11 V-11 Z M-9 0 L-2 7 L11 -8",
};

/**
 * Bounded schematic objects are local paths with no remote asset dependency.
 */
export function ObjectGlyph({
  kind,
  x,
  y,
  size = 48,
  color = STOCK.mint,
}: Readonly<Props>): ReactNode {
  if (
    ![x, y, size].every(Number.isFinite) ||
    size < 8 ||
    size > 160 ||
    !(kind in OBJECT_PATHS)
  ) {
    throw new Error("Object glyph placement, size or kind is unsupported.");
  }
  return (
    <g
      transform={`translate(${x} ${y}) scale(${size / 48})`}
      fill={color}
      fillOpacity={0.06}
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={OBJECT_PATHS[kind]} />
    </g>
  );
}
