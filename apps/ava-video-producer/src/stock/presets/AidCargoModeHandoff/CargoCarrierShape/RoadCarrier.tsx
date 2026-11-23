import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = { mode: "truck" | "cargo-bike"; accent: string };
/** Road transport silhouette for the selected carrier mode. */
export function RoadCarrier({ mode, accent }: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const isTruck = mode === "truck";
  return (
    <>
      <SketchedShape
        shape={{
          kind: "path",
          d: isTruck
            ? "M-100 -17 H62 V-39 H84 L105 -17 V10 H-100 Z M68 -31 H80 L93 -17 H68 Z"
            : "M-100 -17 H58 V6 H-100 Z M60 10 L80 -20 L100 10 H60 M80 -20 H95 M91 -26 H103",
        }}
        profile={tokens.sketch.shape}
        fill={tokens.color.surface}
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.default)}
      />
      <SketchedShape
        shape={{
          kind: "circle",
          cx: isTruck ? -72 : -76,
          cy: isTruck ? 13 : 15,
          r: 12,
        }}
        profile={tokens.sketch.shape}
        fill={tokens.color.ground}
        stroke={accent}
      />
      <SketchedShape
        shape={{
          kind: "circle",
          cx: isTruck ? 77 : 100,
          cy: isTruck ? 13 : 15,
          r: 12,
        }}
        profile={tokens.sketch.shape}
        fill={tokens.color.ground}
        stroke={accent}
      />
    </>
  );
}
