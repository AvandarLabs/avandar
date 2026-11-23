import { SketchedShape } from "../../../primitives/SketchedShape";
import { StockRect } from "../../../primitives/StockRect";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = {
  accent: string;
  atomic: ReturnType<typeof GraphicThemeHooks.useGraphicTheme>["atomic"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
};
/** Draws the capture equipment before retained and released flows. */
export function CarbonCaptureEquipment({
  accent,
  atomic,
  tokens,
  scales,
}: Readonly<Props>): ReactNode {
  return (
    <>
      <SketchedShape
        shape={{ kind: "path", d: "M50 290 V412 H475" }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={tokens.color.line}
        strokeDasharray={atomic.dash.boundary.join(" ")}
      />
      <StockRect
        x={205}
        y={284}
        width={92}
        height={86}
        rx={scales.corner(tokens.corner.cell)}
        fill={tokens.color.surface}
        stroke={tokens.color.line}
      />
      <SketchedShape
        shape={{ kind: "path", d: "M213 294 H287 M213 302 H287 M213 310 H287" }}
        profile={tokens.sketch.shape}
        stroke={tokens.color.inactive}
      />
      <SketchedShape
        shape={{ kind: "path", d: "M70 360 H245" }}
        profile={tokens.sketch.shape}
        stroke={accent}
        strokeWidth={scales.stroke(24)}
        strokeOpacity={scales.wash(atomic.opacity["22"])}
        fill="none"
      />
    </>
  );
}
