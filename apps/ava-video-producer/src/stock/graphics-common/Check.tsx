import { SketchedShape } from "../primitives/SketchedShape";
import {
  useGraphicProps,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../theme/useGraphicTheme/useGraphicTheme";
import type { ReactNode } from "react";

/** A themed check mark in the caller's colour and size. */
export function Check({
  x,
  y,
  color,
  size,
}: {
  x: number;
  y: number;
  color: string;
  size: number;
}): ReactNode {
  const check = useGraphicProps("Check", {});
  const { sketch } = useGraphicTokens();
  const scales = useGraphicShapeScales();
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
