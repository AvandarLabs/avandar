import { SketchedShape } from "../primitives/SketchedShape";
import {
  useGraphicProps,
  useGraphicShapeScales,
} from "../theme/useGraphicTheme/useGraphicTheme";
import type { ReactNode } from "react";

/** A themed dashed guide ellipse, such as an orbit. */
export function Guide({
  cx,
  cy,
  rx,
  ry,
}: {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}): ReactNode {
  const guide = useGraphicProps("Guide", {});
  const scales = useGraphicShapeScales();
  return (
    <SketchedShape
      shape={{ kind: "ellipse", cx, cy, rx, ry }}
      profile={guide.sketch}
      fill="none"
      stroke={guide.color}
      strokeWidth={scales.stroke(guide.strokeWidth)}
      strokeDasharray={guide.dash.length ? guide.dash.join(" ") : undefined}
      opacity={guide.alpha}
    />
  );
}
