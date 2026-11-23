import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { Halo } from "../Halo";
import { getPacketStateFromFrame } from "./getPacketStateFromFrame";
import type { Props } from "./Packet.types";
import type { ReactNode } from "react";

/**
 * A looping themed packet for network and data studies. An authored radius
 * can override the theme’s small and medium packet sizes.
 */
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
}: Readonly<Props>): ReactNode {
  const packet = GraphicThemeHooks.useGraphicProps({
    name: "Packet",
    props: { period },
  });
  const motion = GraphicThemeHooks.useGraphicMotion();
  const packetRadius =
    radius ?? (size === "sm" ? packet.radiusSm : packet.radius);
  const { point, opacity } = getPacketStateFromFrame({
    frame,
    from,
    to,
    delay,
    bend,
    packet,
    motion,
  });
  return (
    <g opacity={opacity}>
      <Halo cx={point.x} cy={point.y} r={packetRadius} color={color} />
      <circle cx={point.x} cy={point.y} r={packetRadius} fill={color} />
    </g>
  );
}
