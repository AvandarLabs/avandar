import { mix } from "../../motion";
import { SketchedShape } from "../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicProps,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../theme/useGraphicTheme/useGraphicTheme";
import type { Point } from "./graphicCommon.types";
import type { ReactNode } from "react";

/** A themed highlighted route segment that grows with `progress`. */
export function Route({
  from,
  to,
  progress,
  frame,
  at,
  color,
}: {
  from: Point;
  to: Point;
  progress: number;
  frame: number;
  at: number;
  color: string;
}): ReactNode {
  const route = useGraphicProps("Route", {});
  const motion = useGraphicMotion();
  const { sketch } = useGraphicTokens();
  const scales = useGraphicShapeScales();
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
