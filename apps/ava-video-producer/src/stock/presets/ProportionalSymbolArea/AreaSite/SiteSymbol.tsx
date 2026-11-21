import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { type Props as AreaSiteSharedProps } from "./AreaSiteShared.types";
import type { ReactNode } from "react";

type Props = Pick<AreaSiteSharedProps, "site" | "input" | "accent"> & {
  radius: number;
  progress: number;
};

/** The site's circle of the same total area, filled once the tiles merge. */
export function SiteSymbol({
  site,
  input,
  radius,
  progress,
  accent,
}: Readonly<Props>): ReactNode {
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const { stroke, sketch } = GraphicThemeHooks.useGraphicTokens();
  const shapes = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <SketchedShape
      data-symbol={site.id}
      data-area={site.value * input.areaPerUnit}
      shape={{
        kind: "circle",
        cx: 48 + site.x * 4,
        cy: 148 + site.y * 4,
        r: radius,
      }}
      profile={sketch.shape}
      fill={accent}
      fillOpacity={progress === 1 ? atomic.opacity["55"] : 0}
      stroke={accent}
      strokeOpacity={progress}
      strokeWidth={shapes.stroke(stroke.hairline)}
    />
  );
}
