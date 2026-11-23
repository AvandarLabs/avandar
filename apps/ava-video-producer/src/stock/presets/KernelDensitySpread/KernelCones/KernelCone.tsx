import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { KernelConesShared } from "./KernelConesShared";
import type { ReactNode } from "react";

type Props = {
  pointId: string;
  center: Readonly<{ cx: number; cy: number }>;
  radius: number;
  height: number;
  accent: string;
};
/** One weighted cone over its observation, with its kernel's boundary. */
export function KernelCone({
  pointId,
  center,
  radius,
  height,
  accent,
}: Readonly<Props>): ReactNode {
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const { stroke, alpha, sketch } = GraphicThemeHooks.useGraphicTokens();
  const shapes = GraphicThemeHooks.useGraphicShapeScales();
  const hairline = shapes.stroke(stroke.hairline);
  return (
    <>
      <SketchedShape
        data-kernel-boundary={pointId}
        shape={{ kind: "circle", ...center, r: radius * 2.8 }}
        profile={sketch.shape}
        fill="none"
        stroke={accent}
        strokeOpacity={atomic.opacity["32"]}
        strokeWidth={hairline}
      />
      <SketchedShape
        data-cone={pointId}
        shape={{
          kind: "path",
          d: `M ${center.cx - radius * 2.8} ${center.cy} L ${center.cx} ${center.cy - height} L ${center.cx + radius * 2.8} ${center.cy} Z`,
        }}
        profile={sketch.shape}
        fill={accent}
        fillOpacity={shapes.wash(KernelConesShared.CONE_FILL_ALPHA)}
        stroke={accent}
        strokeOpacity={alpha.dimmed}
        strokeWidth={hairline}
      />
    </>
  );
}
