import { ramp } from "../../../motion";
import { STOCK } from "../../stockPalette";
import { ConvoyLandmarks } from "./ConvoyLandmarks";
import type { Input } from "./ConvoyRouteDetour.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/** Authored roads retain the closure even after the receiving gate opens. */
export function ConvoyMap({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const points = input.routes.find(({ role }) => role === "blocked")!.points;
  const start = points[input.obstruction.segmentIndex];
  const end = points[input.obstruction.segmentIndex + 1];
  return (
    <g>
      {input.routes.map((route, index) => (
        <path
          key={route.role}
          data-road={route.role}
          data-route-id={route.id}
          d={route.points
            .map(
              (point, pointIndex) =>
                `${pointIndex ? "L" : "M"}${80 + point.x * 800} ${180 + point.y * 280}`,
            )
            .join(" ")}
          fill="none"
          stroke={route.role === "detour" ? accent : STOCK.muted}
          strokeWidth={
            route.role === "detour" ? 3 + 2 * ramp(frame, 60, 18) : 4
          }
          strokeOpacity={ramp(frame, 10 + index * 3, 15)}
          strokeLinejoin="round"
        />
      ))}
      <g
        data-obstruction={input.obstruction.kind}
        transform={`translate(${80 + (start.x + end.x) * 400} ${180 + (start.y + end.y) * 140})`}
      >
        <path
          d="M-20 -17 L20 17 M-20 17 L20 -17"
          stroke={STOCK.orange}
          strokeWidth={5}
        />
        {input.obstruction.kind === "bridge-closure" ? (
          <path
            d="M-28 -24 V24 M28 -24 V24"
            stroke={STOCK.orange}
            strokeWidth={3}
          />
        ) : undefined}
      </g>
      <ConvoyLandmarks input={input} frame={frame} accent={accent} />
    </g>
  );
}
