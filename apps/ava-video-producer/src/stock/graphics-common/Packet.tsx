import { loopPhase, mix, ramp } from "../../motion";
import {
  useGraphicMotion,
  useGraphicProps,
} from "../theme/useGraphicTheme/useGraphicTheme";
import { cubicPoint } from "./cubicPoint";
import { Halo } from "./Halo";
import type { Point } from "./graphicCommon.types";
import type { ReactNode } from "react";

const PACKET_FADE_IN_AT = 34;
const PACKET_EDGE_FADE = 10;

/** A themed packet looping along a curved edge, with its halo. */
export function Packet({
  frame,
  from,
  to,
  color,
  delay = 0,
  period,
  size = "md",
  radius,
  bend = 0,
}: {
  frame: number;
  from: Point;
  to: Point;
  color: string;
  delay?: number;
  period?: number;
  size?: "sm" | "md";
  /** A content override that out-of-scope presets may pass. */
  radius?: number;
  bend?: number;
}): ReactNode {
  const packet = useGraphicProps("Packet", { period });
  const motion = useGraphicMotion();
  const r = radius ?? (size === "sm" ? packet.radiusSm : packet.radius);
  const t = loopPhase(frame, packet.period, delay);
  const point = cubicPoint(
    from,
    { x: mix(packet.curveTension, from.x, to.x), y: from.y + bend },
    { x: mix(1 - packet.curveTension, from.x, to.x), y: to.y + bend },
    to,
    t,
  );
  const opacity =
    ramp(frame, PACKET_FADE_IN_AT, motion.scale(packet.fadeIn)) *
    Math.min(1, t * PACKET_EDGE_FADE, (1 - t) * PACKET_EDGE_FADE);
  return (
    <g opacity={opacity}>
      <Halo cx={point.x} cy={point.y} r={r} color={color} />
      <circle cx={point.x} cy={point.y} r={r} fill={color} />
    </g>
  );
}
