import { mix } from "../../motion";
import type { Point } from "./graphicCommon.types";

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
}: {
  from: Point;
  to: Point;
  bend?: number;
  tension?: number;
}): string {
  return `M${from.x},${from.y} C${mix(tension, from.x, to.x)},${from.y + bend} ${mix(1 - tension, from.x, to.x)},${to.y + bend} ${to.x},${to.y}`;
}
