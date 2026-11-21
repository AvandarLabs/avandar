import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { ScanLinesShared } from "./ScanLinesShared/ScanLinesShared";
import type { ReactNode } from "react";

type Props = { y: number; index: number };

/** Two sketched placeholder values, their lengths varied by row. */
export function ScanRowPlaceholder({ y, index }: Readonly<Props>): ReactNode {
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const { color, sketch } = GraphicThemeHooks.useGraphicTokens();
  const shapes = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <SketchedShape
      shape={{
        kind: "path",
        d: `M423 ${y + 2} h${118 + (index % 3) * 23} M625 ${y + 2} h${53 + (index % 2) * 34}`,
      }}
      profile={sketch.shape}
      stroke={color.inactive}
      strokeOpacity={atomic.opacity["28"]}
      strokeWidth={shapes.stroke(ScanLinesShared.PLACEHOLDER_STROKE)}
      strokeLinecap="round"
    />
  );
}
