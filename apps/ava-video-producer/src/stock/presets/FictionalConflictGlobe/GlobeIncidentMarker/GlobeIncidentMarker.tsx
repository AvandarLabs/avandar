import { SketchedShape } from "../../../primitives/SketchedShape";
import { GlobeIncidentLeader } from "../GlobeIncidentLeader/GlobeIncidentLeader";
import type { projectGlobePoint } from "../../../geography/projectGlobePoint/projectGlobePoint";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../FictionalConflictGlobe.schema";
import type { ReactNode } from "react";

type Props = {
  point: ReturnType<typeof projectGlobePoint>;
  incident: Input["incidents"][number];
  x: number;
  y: number;
  showLabel: boolean;
  incidents: Input["incidents"];
  longitude: number;
  labelY: number;
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  accent: string;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
};

/** Renders the incident id with authored geometry. */
export function GlobeIncidentMarker({
  point,
  incident,
  x,
  y,
  showLabel,
  incidents,
  longitude,
  labelY,
  tokens,
  accent,
  scales,
}: Readonly<Props>): ReactNode {
  return (
    <>
      {point.visible ? (
        <g data-incident-id={incident.id} data-x={x} data-y={y}>
          <GlobeIncidentLeader
            {...{ showLabel, incident, incidents, longitude, x, y }}
            labelY={labelY}
            tokens={tokens}
          />
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
    </>
  );
}
