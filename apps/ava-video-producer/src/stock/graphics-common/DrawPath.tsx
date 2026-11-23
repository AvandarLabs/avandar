import { Motion } from "../../motion";
import { SketchedShape } from "../primitives/SketchedShape";
import { GraphicThemeHooks } from "../theme/GraphicThemeHooks/GraphicThemeHooks";
import { Curve } from "./Curve";
import type { Point } from "./graphicCommon.types";
import type { ReactNode } from "react";

type Props = {
  d?: string;
  curve?: Readonly<{
    from: Point;
    to: Point;
    bend?: number;
  }>;
  frame: number;
  at?: number;
  duration?: number;
  color?: string;
  width?: number;
  opacity?: number;
  dashed?: boolean;
};
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
}: Readonly<Props>): ReactNode {
  const edge = GraphicThemeHooks.useGraphicProps({
    name: "Edge",
    props: {
      color,
      strokeWidth: width,
    },
  });
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const path =
    d ?? (curve ? Curve({ ...curve, tension: edge.curveTension }) : "");
  const t = Motion.ramp({
    frame,
    at,
    dur: motion.scale(duration ?? edge.drawDuration),
    easing: motion.curve(edge.drawEasing),
  });
  return (
    <SketchedShape
      shape={{ kind: "path", d: path }}
      profile={edge.sketch}
      pathLength={1}
      fill="none"
      stroke={edge.color}
      strokeWidth={scales.stroke(edge.strokeWidth)}
      strokeLinecap={edge.cap}
      strokeDasharray={dashed ? edge.dash.join(" ") : 1}
      strokeDashoffset={dashed ? 0 : 1 - t}
      opacity={opacity * (dashed ? t : 1)}
    />
  );
}
