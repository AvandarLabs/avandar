import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = { isAppliance: boolean };

/** A dial on a returned appliance, or feet on a returned module. */
export function ReturnedShellDetail({
  isAppliance,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  if (isAppliance) {
    return (
      <SketchedShape
        shape={{ kind: "circle", cx: 185, cy: 325, r: 6 }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={tokens.color.inactive}
      />
    );
  }
  return (
    <SketchedShape
      shape={{ kind: "path", d: "M65 335v8M305 335v8" }}
      profile={tokens.sketch.shape}
      stroke={tokens.color.inactive}
      strokeWidth={scales.stroke(tokens.stroke.emphasis)}
    />
  );
}
