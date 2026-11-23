import { Motion } from "../../motion";
import type { Point } from "./graphicCommon.types";

type CurveOptions = {
  from: Point;
  to: Point;
  bend?: number;
  tension?: number;
};
/**
 * A curved path between two points. `tension` places the control points;
 * themed shapes pass their `curveTension` token. Pure, so out-of-scope
 * presets can keep calling it for `d` strings.
 */
export function Curve({
  from,
  to,
  bend = 0,
  tension = 0.45,
}: CurveOptions): string {
  return `M${from.x},${from.y} C${Motion.mix({
    t: tension,
    from: from.x,
    to: to.x,
  })},${from.y + bend} ${Motion.mix({
    t: 1 - tension,
    from: from.x,
    to: to.x,
  })},${to.y + bend} ${to.x},${to.y}`;
}
