import { EASE, mix, ramp } from "../../../motion";
import type { ReactNode } from "react";
type Props = { criterionId: string; y: number; frame: number; accent: string };
/**
 * The authored focus expands across the existing pair without removing rows.
 */
export function ContrastBand({
  criterionId,
  y,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const focus = ramp(frame, 96, 24, EASE.inOut);
  const width = mix(focus, 168, 848);
  const band = { x: 480 - width / 2, y: y - 30, width, height: 100, rx: 12 };
  return (
    <g>
      <rect
        data-comparison-band={criterionId}
        {...band}
        fill={accent}
        fillOpacity={0.08 * focus}
        stroke={accent}
        strokeOpacity={focus}
      />
      <line
        x1={80}
        x2={880}
        y1={y + 70}
        y2={y + 70}
        stroke={accent}
        strokeWidth={2}
        opacity={focus}
      />
    </g>
  );
}
