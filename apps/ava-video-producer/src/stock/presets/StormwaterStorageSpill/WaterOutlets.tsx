import { ramp, EASE } from "../../../motion";
import { WATER_DESTINATIONS } from "./waterDestinationKeys";
import type { Input } from "./StormwaterStorageSpill.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number };
/** Infiltration and controlled discharge occupy separate physical outlets. */
export function WaterOutlets({ input, frame }: Readonly<Props>): ReactNode {
  const progress = ramp(frame, 48, 36, EASE.inOut);
  const outlets = [
    {
      id: "infiltration",
      amount: input.event.infiltratedM3,
      path: "M390 380V403H200",
      x: 130,
      color: WATER_DESTINATIONS.infiltration.color,
    },
    {
      id: "discharge",
      amount: input.event.dischargedM3,
      path: "M620 360H720V400",
      x: 650,
      color: WATER_DESTINATIONS.discharge.color,
    },
  ];
  return (
    <g>
      {outlets.map((outlet) => (
        <g key={outlet.id}>
          <path
            data-outlet={outlet.id}
            d={outlet.path}
            fill="none"
            stroke={outlet.color}
            strokeWidth={3}
            opacity={outlet.amount > 0 ? progress : 0}
          />
          <rect
            data-water-pool={outlet.id}
            x={outlet.x}
            y={400}
            width={((140 * outlet.amount) / input.event.incomingM3) * progress}
            height={12}
            fill={outlet.color}
          />
        </g>
      ))}
    </g>
  );
}
