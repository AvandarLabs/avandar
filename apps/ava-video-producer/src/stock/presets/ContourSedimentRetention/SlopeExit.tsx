import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "./ContourSedimentRetention.schema";
import type { ReactNode } from "react";
/** Inputs for SlopeExit. */
type Props = { input: Input };
/** An optional receiving tray never hides the persistent boundary arrow. */
export function SlopeExit({ input }: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <g>
      <SketchedShape
        shape={{ kind: "path", d: "M730 355H775l-8 -7M775 355l-8 7" }}
        profile={tokens.sketch.shape}
        data-export-arrow="physical"
        fill="none"
        stroke={tokens.color.highlight}
        strokeWidth={scales.stroke(tokens.stroke.default)}
      />
      {input.showExportTray ? (
        <SketchedShape
          shape={{ kind: "path", d: "M765 360V395H910V360" }}
          profile={tokens.sketch.shape}
          data-export-tray="physical"
          fill="none"
          stroke={tokens.color.inactive}
          strokeWidth={scales.stroke(tokens.stroke.default)}
        />
      ) : undefined}
    </g>
  );
}
