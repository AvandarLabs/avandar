import { STOCK } from "../../stockPalette";
import type { Input } from "./CustodyTransfer.schema";
import type { ReactNode } from "react";
type Props = { shape: Input["objectShape"]; accent: string };
const FOLIO: Record<"x" | "y" | "width" | "height" | "rx", number> = {
  x: 452,
  y: 240,
  width: 56,
  height: 136,
  rx: 5,
};
const BATON: Record<"x" | "y" | "width" | "height" | "rx", number> = {
  x: 465,
  y: 240,
  width: 30,
  height: 136,
  rx: 15,
};
const KEY_STEM: Record<"x1" | "x2" | "y1" | "y2" | "strokeWidth", number> = {
  x1: 480,
  x2: 480,
  y1: 284,
  y2: 376,
  strokeWidth: 8,
};
/** Every silhouette ends at the shared physical support anchor. */
export function CustodyObjectShape({
  shape,
  accent,
}: Readonly<Props>): ReactNode {
  return shape === "key" ? (
    <g>
      <circle
        cx={480}
        cy={262}
        r={22}
        fill="none"
        stroke={accent}
        strokeWidth={8}
      />
      <line data-object-base={shape} {...KEY_STEM} stroke={accent} />
      <path
        d="M480 366 H498 V352 H480"
        fill="none"
        stroke={accent}
        strokeWidth={8}
      />
    </g>
  ) : (
    <rect
      data-object-base={shape}
      {...(shape === "folio" ? FOLIO : BATON)}
      fill={STOCK.elevated}
      stroke={accent}
      strokeWidth={2}
    />
  );
}
