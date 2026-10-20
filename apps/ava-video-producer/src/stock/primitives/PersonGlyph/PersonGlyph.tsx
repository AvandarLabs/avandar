import { STOCK } from "../../graphics-common";
import type { ReactNode } from "react";

type Props = {
  x: number;
  y: number;
  size?: number;
  posture?: "standing" | "seated" | "walking";
  role?: "participant" | "facilitator" | "worker";
  color?: string;
};
const POSTURES: { standing: string; seated: string; walking: string } = {
  standing: "M0 -4 V12 M-10 5 L0 0 L10 5 M0 12 L-7 25 M0 12 L7 25",
  seated: "M0 -4 V9 H12 V24 M0 9 L-8 14 V24 M-10 3 L0 0 L11 4",
  walking: "M0 -4 L-3 11 M-11 7 L0 0 L10 -2 M-3 11 L-12 23 M-3 11 L10 18",
};

function _validatePresentation({
  x,
  y,
  size,
  posture,
  role,
}: Readonly<Required<Omit<Props, "color">>>): void {
  if (
    ![x, y, size].every(Number.isFinite) ||
    size < 8 ||
    size > 160 ||
    !(posture in POSTURES) ||
    !["participant", "facilitator", "worker"].includes(role)
  ) {
    throw new Error(
      "Person glyph placement, size, posture or role is unsupported.",
    );
  }
}

/** Neutral local person shapes encode only authored posture and role badges. */
export function PersonGlyph({
  x,
  y,
  size = 48,
  posture = "standing",
  role = "participant",
  color = STOCK.mint,
}: Readonly<Props>): ReactNode {
  _validatePresentation({ x, y, size, posture, role });
  return (
    <g
      transform={`translate(${x} ${y}) scale(${size / 48})`}
      stroke={color}
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    >
      <circle cx={0} cy={-14} r={7} fill={color} fillOpacity={0.12} />
      <path d={POSTURES[posture]} />
      {role === "facilitator" ? <path d="M16 -17 h9 M20 -21 v8" /> : null}
      {role === "worker" ? <path d="M9 8 h10 v8 H9 Z M12 8 V5 h4 v3" /> : null}
    </g>
  );
}
