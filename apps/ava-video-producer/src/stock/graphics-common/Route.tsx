import { mix } from "../../motion";
import { SketchedShape } from "../primitives/SketchedShape";
import { GraphicThemeHooks } from "../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Point } from "./graphicCommon.types";
import type { ReactNode } from "react";

type Props = {
  from: Point;
  to: Point;
  progress: number;
  frame: number;
  at: number;
  color: string;
};
/** A themed highlighted route segment that grows with `progress`. */
export function Route({
  from,
  to,
  progress,
  frame,
  at,
  color,
}: Readonly<Props>): ReactNode {
  const route = GraphicThemeHooks.useGraphicProps("Route", {});
  const motion = GraphicThemeHooks.useGraphicMotion();
  const { sketch } = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <SketchedShape
      shape={{
        kind: "line",
        x1: from.x,
        y1: from.y,
        x2: mix(progress, from.x, to.x),
        y2: mix(progress, from.y, to.y),
      }}
      profile={sketch.shape}
      stroke={color}
      strokeWidth={scales.stroke(route.strokeWidth)}
      strokeLinecap={route.cap}
      opacity={motion.ramp(frame, at, motion.scale(route.fadeIn))}
    />
  );
}
