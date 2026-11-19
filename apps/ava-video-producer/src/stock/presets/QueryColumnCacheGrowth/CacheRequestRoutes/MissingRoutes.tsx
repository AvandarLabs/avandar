import { SketchedShape } from "../../../primitives/SketchedShape";
import {
  useGraphicProps,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../../theme/useGraphicTheme/useGraphicTheme";
import type { ReactNode } from "react";

/** Draws the route from the second request to each missing column. */
export function MissingRoutes({
  missingIds,
}: Readonly<{ missingIds: string[] }>): ReactNode {
  const style = useGraphicProps("QueryColumnCacheGrowth", {});
  const scales = useGraphicShapeScales();
  const { color, sketch } = useGraphicTokens();
  return missingIds.map((id, index) => {
    return (
      <SketchedShape
        key={id}
        shape={{ kind: "path", d: `M700 178 V184 H${139 + index * 168} V191` }}
        profile={sketch.shape}
        data-missing-route={id}
        fill="none"
        stroke={color.highlight}
        strokeWidth={scales.stroke(style.routeStrokeWidth)}
      />
    );
  });
}
