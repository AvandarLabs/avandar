import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { getCoordinationPlaceColorFromIndex } from "./getCoordinationPlaceColorFromIndex";
import type { Input } from "./CommunityCoordinationTable.schema";
import type { ReactNode } from "react";

type Props = { input: Input; accent: string };
/**
 * Request connectors sit below physical tokens so their keys remain legible.
 */
export function CoordinationPlaceConnections({
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  return (
    <g>
      {input.places.map((place, index) => {
        return (
          <SketchedShape
            key={place.id}
            shape={{
              kind: "path",
              d: `M322 ${120 + 108 * index} L330 ${120 + 108 * index} L${340 + place.x * 270} ${160 + place.y * 280}`,
            }}
            profile={tokens.sketch.shape}
            data-place-connector={place.id}
            fill="none"
            stroke={getCoordinationPlaceColorFromIndex({ index, accent })}
            strokeWidth={scales.stroke(tokens.stroke.outline)}
          />
        );
      })}
    </g>
  );
}
