import { ramp } from "../../../motion";
import { STOCK } from "../../stockPalette";
import type { Input } from "./LocationUncertaintyBoundary.schema";
import type { ReactNode } from "react";

type Props = {
  district: Input["districts"][number];
  index: number;
  frame: number;
  isPossible: boolean;
  accent: string;
};
/** Polygon boundaries connect to the corresponding lifted legend key. */
export function DistrictFootprint({
  district,
  index,
  frame,
  isPossible,
  accent,
}: Readonly<Props>): ReactNode {
  const connectorY =
    120 + index * 40 - (isPossible ? 8 * ramp(frame, 60, 36) : 0);
  return (
    <g>
      <polygon
        data-district={district.id}
        points={district.polygon
          .map(([x, y]) => `${50 + x * 3.6},${140 + y * 3.6}`)
          .join(" ")}
        fill={index % 2 ? STOCK.cyan : accent}
        fillOpacity={0.08}
        stroke={STOCK.line}
      />
      <path
        data-district-connector={district.id}
        d={`M${50 + district.polygon[0][0] * 3.6} ${140 + district.polygon[0][1] * 3.6} L430 ${connectorY} H474`}
        fill="none"
        stroke={STOCK.muted}
        strokeWidth={0.8}
      />
    </g>
  );
}
