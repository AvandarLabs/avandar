import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = {
  missingIds: string[];
};
/** Draws the route from the second request to each missing column. */
export function MissingRoutes({ missingIds }: Readonly<Props>): ReactNode {
  const style = GraphicThemeHooks.useGraphicProps({
    name: "QueryColumnCacheGrowth",
    props: {},
  });
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const { color, sketch } = GraphicThemeHooks.useGraphicTokens();
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
