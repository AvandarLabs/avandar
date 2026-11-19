import { projectGlobePoint } from "../../geography/projectGlobePoint/projectGlobePoint";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
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
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
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
            <SketchedShape
              shape={{
                kind: "path",
                d: buildIncidentLeaderFromPoints({
                  incident,
                  incidents,
                  longitude,
                  x,
                  y,
                  labelY,
                }),
              }}
              profile={tokens.sketch.shape}
              data-leader={incident.id}
              fill="none"
              stroke={tokens.color.inactive}
            />
          ) : undefined}
          <SketchedShape
            shape={{
              kind: "path",
              d: `M${x - 7} ${y - 7} L${x + 7} ${y + 7} M${x + 7} ${y - 7} L${x - 7} ${y + 7}`,
            }}
            profile={tokens.sketch.shape}
            data-incident-cross={incident.id}
            fill="none"
            stroke={accent}
            strokeWidth={scales.stroke(tokens.stroke.emphasis)}
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
