import { ramp, EASE } from "../../../motion";
import { STOCK } from "../../stockPalette";
import type { Input } from "./DistanceBufferEnvelope.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
function _getCompassGeometry({
  input,
  frame,
}: Readonly<Pick<Props, "input" | "frame">>) {
  const sweep = ramp(frame, 51, 54, EASE.inOut);
  const x = 48 + input.origin.x * 3.6,
    y = 190 + input.origin.y * 3.6;
  const radius = input.radiusUnits * 3.6;
  const center = { cx: x, cy: y };
  const ruler = { x1: x, y1: y, x2: x + radius * ramp(frame, 13, 37), y2: y };
  const arm = {
    x1: x,
    y1: y,
    x2: x + Math.cos(sweep * Math.PI * 2) * radius,
    y2: y + Math.sin(sweep * Math.PI * 2) * radius,
  };
  return { sweep, radius, center, ruler, arm };
}
/** A center-anchored compass sweeps the exact supplied Euclidean radius. */
export function BufferCompass({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const { sweep, radius, center, ruler, arm } = _getCompassGeometry({
    input,
    frame,
  });
  return (
    <g>
      <circle
        data-buffer-circle=""
        {...center}
        r={radius}
        fill={accent}
        fillOpacity={0.04 * sweep}
        stroke={accent}
        strokeWidth={2}
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - sweep}
      />
      <line
        data-radius-ruler=""
        {...ruler}
        stroke={STOCK.orange}
        strokeWidth={2}
      />
      <line
        data-compass-arm=""
        {...arm}
        stroke={accent}
        strokeWidth={2}
        opacity={ramp(frame, 51, 9) * (1 - ramp(frame, 106, 12))}
      />
      <circle
        data-origin-position={`${input.origin.x},${input.origin.y}`}
        {...center}
        r={6}
        fill={STOCK.orange}
      />
    </g>
  );
}
