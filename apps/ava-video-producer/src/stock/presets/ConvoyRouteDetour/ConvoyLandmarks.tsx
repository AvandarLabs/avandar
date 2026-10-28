import { ramp } from "../../../motion";
import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
import { STOCK } from "../../stockPalette";
import type { Input } from "./ConvoyRouteDetour.schema";
import type { ReactNode } from "react";
type Props = { input: Input; frame: number; accent: string };
/** Numbered depot, receiving gate and branch junction match the label rail. */
export function ConvoyLandmarks({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const points = input.routes.find(({ role }) => role === "blocked")!.points;
  const destination = points.at(-1)!;
  return (
    <g>
      {[points[0], destination, points[1]].map((point, index) => (
        <text
          key={index}
          x={80 + point.x * 800}
          y={180 + point.y * 280 + 44}
          fill={STOCK.cyan}
          fontSize={14}
          textAnchor="middle"
        >
          {index + 1}
        </text>
      ))}
      <path
        d={`M${80 + points[0].x * 800 - 20} ${180 + points[0].y * 280 - 22} v-20 l20 -15 l20 15 v20 Z`}
        fill={STOCK.surface}
        stroke={STOCK.cyan}
      />
      <g
        data-gate="arrival"
        transform={`translate(${80 + destination.x * 800} ${180 + destination.y * 280})`}
      >
        <path
          d={`M-25 -28 V-52 M25 -28 V-52 M-25 -40 L${25 - 42 * ramp(frame, 114, 12)} ${-40 - 28 * ramp(frame, 114, 12)}`}
          stroke={accent}
          strokeWidth={3}
        />
        <PersonGlyph x={42} y={-40} size={30} color={STOCK.cyan} />
      </g>
    </g>
  );
}
