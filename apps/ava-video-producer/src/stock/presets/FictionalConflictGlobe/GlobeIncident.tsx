import { projectGlobePoint } from "../../geography/projectGlobePoint/projectGlobePoint";
import { STOCK } from "../../stockPalette";
import { buildIncidentLeaderFromPoints } from "./buildIncidentLeaderFromPoints";
import { GlobeIncidentLabel } from "./GlobeIncidentLabel";
import type { Input } from "./FictionalConflictGlobe.schema";
import type { ReactNode } from "react";

type Props = {
  incident: Input["incidents"][number];
  incidents: Input["incidents"];
  index: number;
  longitude: number;
  showLabel: boolean;
  accent: string;
};
/** Coincident coordinates keep separate label slots and unchanged marks. */
export function GlobeIncident({
  incident,
  incidents,
  index,
  longitude,
  showLabel,
  accent,
}: Readonly<Props>): ReactNode {
  const point = projectGlobePoint({
    ...incident,
    centerLongitude: longitude,
    centerLatitude: 0,
    radius: 195,
  });
  const x = 390 + point.x;
  const y = 285 + point.y;
  const labelY = 145 + index * 100;
  return (
    <g>
      {point.visible ? (
        <g data-incident-id={incident.id} data-x={x} data-y={y}>
          {showLabel ? (
            <path
              data-leader={incident.id}
              d={buildIncidentLeaderFromPoints({
                incident,
                incidents,
                longitude,
                x,
                y,
                labelY,
              })}
              fill="none"
              stroke={STOCK.muted}
            />
          ) : undefined}
          <path
            data-incident-cross={incident.id}
            d={`M${x - 7} ${y - 7} L${x + 7} ${y + 7} M${x + 7} ${y - 7} L${x - 7} ${y + 7}`}
            fill="none"
            stroke={accent}
            strokeWidth={3}
            strokeLinecap="round"
          />
        </g>
      ) : undefined}
      {showLabel ? (
        <GlobeIncidentLabel
          incident={incident}
          index={index}
          labelY={labelY}
          visible={point.visible}
          accent={accent}
        />
      ) : undefined}
    </g>
  );
}
