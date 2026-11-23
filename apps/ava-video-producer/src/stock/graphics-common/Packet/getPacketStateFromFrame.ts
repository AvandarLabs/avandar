import { Motion } from "../../../motion";
import { cubicPoint } from "../cubicPoint";
import { PACKET_FADE_IN_AT, PACKET_EDGE_FADE } from "./Packet.constants";
import type {
  GetPacketPointAndOpacityOptions,
  GetPacketPointAndOpacityResult,
} from "./Packet.types";

/** Supplies Packet with frame-specific rendering geometry or progress. */
export function getPacketStateFromFrame({
  frame,
  from,
  to,
  delay,
  bend,
  packet,
  motion,
}: Readonly<GetPacketPointAndOpacityOptions>): GetPacketPointAndOpacityResult {
  const t = Motion.loopPhase({
    frame,
    period: packet.period,
    offset: delay,
  });
  const point = cubicPoint({
    a: from,
    b: {
      x: Motion.mix({
        t: packet.curveTension,
        from: from.x,
        to: to.x,
      }),
      y: from.y + bend,
    },
    c: {
      x: Motion.mix({
        t: 1 - packet.curveTension,
        from: from.x,
        to: to.x,
      }),
      y: to.y + bend,
    },
    d: to,
    t,
  });
  const opacity =
    motion.ramp(frame, PACKET_FADE_IN_AT, motion.scale(packet.fadeIn)) *
    Math.min(1, t * PACKET_EDGE_FADE, (1 - t) * PACKET_EDGE_FADE);
  return { point, opacity };
}
