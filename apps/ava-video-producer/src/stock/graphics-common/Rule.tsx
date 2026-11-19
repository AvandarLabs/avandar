import { SketchedShape } from "../primitives/SketchedShape";
import {
  useGraphicProps,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../theme/useGraphicTheme/useGraphicTheme";
import type { ReactNode } from "react";

/** A themed horizontal divider. */
export function Rule({
  x1,
  x2,
  y,
}: {
  x1: number;
  x2: number;
  y: number;
}): ReactNode {
  const rule = useGraphicProps("Rule", {});
  const { sketch } = useGraphicTokens();
  const scales = useGraphicShapeScales();
  return (
    <SketchedShape
      shape={{ kind: "line", x1, y1: y, x2, y2: y }}
      profile={sketch.shape}
      stroke={rule.color}
      strokeWidth={scales.stroke(rule.strokeWidth)}
    />
  );
}
