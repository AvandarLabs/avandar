import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";
/**
 * Draws a clinic vehicle wheel at the supplied horizontal position for
 * `ClinicVehicle`.
 */
export function VehicleWheel({ cx }: Readonly<{ cx: number }>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  return (
    <SketchedShape
      shape={{ kind: "circle", cx, cy: 20, r: 7 }}
      profile={tokens.sketch.shape}
      fill={tokens.color.ground}
      stroke={tokens.color.inactive}
    />
  );
}
