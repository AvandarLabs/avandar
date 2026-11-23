import { SketchedShape } from "../../../primitives/SketchedShape";
import { makeIncidentLeaderFromPoints } from "../makeIncidentLeaderFromPoints";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../FictionalConflictGlobe.schema";
import type { ReactNode } from "react";

type Props = {
  showLabel: boolean;
  incident: Input["incidents"][number];
  incidents: Input["incidents"];
  longitude: number;
  x: number;
  y: number;
  labelY: number;
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
};

/** Renders the leader with authored geometry. */
export function GlobeIncidentLeader({
  showLabel,
  incident,
  incidents,
  longitude,
  x,
  y,
  labelY,
  tokens,
}: Readonly<Props>): ReactNode {
  return (
    <>
      {showLabel ? (
        <SketchedShape
          shape={{
            kind: "path",
            d: makeIncidentLeaderFromPoints({
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
    </>
  );
}
