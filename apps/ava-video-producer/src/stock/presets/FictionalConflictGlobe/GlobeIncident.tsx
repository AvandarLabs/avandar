import { projectGlobePoint } from "../../geography/projectGlobePoint/projectGlobePoint";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { GlobeIncidentLabel } from "./GlobeIncidentLabel";
import { GlobeIncidentMarker } from "./GlobeIncidentMarker/GlobeIncidentMarker";
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
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
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
      <GlobeIncidentMarker
        {...{ point, incident, x, y, showLabel, incidents, longitude }}
        {...{ labelY, tokens, accent, scales }}
      />
      {showLabel ? (
        <GlobeIncidentLabel
          {...{ incident, index, labelY }}
          visible={point.visible}
          accent={accent}
        />
      ) : undefined}
    </g>
  );
}
