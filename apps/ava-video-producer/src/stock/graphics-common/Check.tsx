import { SketchedShape } from "../primitives/SketchedShape";
import { GraphicThemeHooks } from "../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = { x: number; y: number; color: string; size: number };
/** A themed check mark in the caller's colour and size. */
export function Check({ x, y, color, size }: Readonly<Props>): ReactNode {
  const check = GraphicThemeHooks.useGraphicProps("Check", {});
  const { sketch } = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const s = size;
  return (
    <SketchedShape
      shape={{
        kind: "path",
        d: `M${x - s * 0.5} ${y} l${s * 0.35} ${s * 0.36} l${s * 0.7} ${-s * 0.8}`,
      }}
      profile={sketch.shape}
      fill="none"
      stroke={color}
      strokeWidth={scales.stroke(check.strokeWidth)}
      strokeLinecap={check.cap}
      strokeLinejoin={check.join}
    />
  );
}
