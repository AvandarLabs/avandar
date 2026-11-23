import { ramp } from "../../motion";
import { SketchedShape } from "../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicProps,
} from "../theme/useGraphicTheme/useGraphicTheme";
import { Curve } from "./Curve";
import type { Point } from "./graphicCommon.types";

/**
 * A themed edge that draws itself in. Give `d`, or `curve` to curve with the
 * theme's tension. `duration` is a content length that tempo still scales.
 */
export function DrawPath({
  d,
  curve,
  frame,
  at = 20,
  duration,
  color,
  width,
  opacity = 1,
  dashed = false,
}: {
  d?: string;
  curve?: Readonly<{ from: Point; to: Point; bend?: number }>;
  frame: number;
  at?: number;
  duration?: number;
  color?: string;
  width?: number;
  opacity?: number;
  dashed?: boolean;
}) {
  const edge = useGraphicProps("Edge", { color, strokeWidth: width });
  const motion = useGraphicMotion();
  const path =
    d ?? (curve ? Curve({ ...curve, tension: edge.curveTension }) : "");
  const t = ramp(
    frame,
    at,
    motion.scale(duration ?? edge.drawDuration),
    motion.curve(edge.drawEasing),
  );
  return (
    <SketchedShape
      shape={{ kind: "path", d: path }}
      profile={edge.sketch}
      pathLength={1}
      fill="none"
      stroke={edge.color}
      strokeWidth={edge.strokeWidth}
      strokeLinecap={edge.cap}
      strokeDasharray={dashed ? edge.dash.join(" ") : 1}
      strokeDashoffset={dashed ? 0 : 1 - t}
      opacity={opacity * (dashed ? t : 1)}
    />
  );
}
