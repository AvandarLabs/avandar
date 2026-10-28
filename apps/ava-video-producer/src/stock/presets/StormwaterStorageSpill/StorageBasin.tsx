import { ramp, EASE } from "../../../motion";
import { STOCK } from "../../stockPalette";
import { WATER_DESTINATIONS } from "./waterDestinationKeys";
import type { Input } from "./StormwaterStorageSpill.schema";
import type { ReactNode } from "react";
type Props = { input: Input; frame: number };
/** Storage fill uses the actual finite capacity and event-volume scale. */
export function StorageBasin({ input, frame }: Readonly<Props>): ReactNode {
  const incoming = input.event.incomingM3;
  const detained = Math.min(
    input.detentionCapacityM3,
    incoming - (input.event.infiltratedM3 + input.event.dischargedM3),
  );
  const height = (detained / incoming) * 140 * ramp(frame, 48, 36, EASE.inOut);
  const lip = 380 - Math.min(input.detentionCapacityM3 / incoming, 1) * 140;
  return (
    <g>
      <path
        d="M40 230H340V380H620V230H920"
        fill="none"
        stroke={STOCK.line}
        strokeWidth={3}
      />
      <rect
        data-water="detention"
        x={340}
        y={380 - height}
        width={280}
        height={height}
        fill={WATER_DESTINATIONS.detained.color}
        fillOpacity={0.4}
      />
      <path
        data-lip="capacity"
        d={`M330 ${lip}H630`}
        stroke={STOCK.orange}
        strokeDasharray="4 4"
      />
    </g>
  );
}
