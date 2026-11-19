import { mix, ramp } from "../../motion";
import { useGraphicMotion } from "../theme/useGraphicTheme/useGraphicTheme";
import type { ReactNode } from "react";

/** Fades and rises children in with the theme's entrance motion. */
export function Arrive({
  frame,
  at = 12,
  index = 0,
  children,
}: {
  frame: number;
  at?: number;
  index?: number;
  children: ReactNode;
}): ReactNode {
  const motion = useGraphicMotion();
  const t = ramp(
    frame,
    at + index * motion.stagger.list,
    motion.entrance.duration,
    motion.entrance.easing,
  );
  return (
    <g
      opacity={t}
      transform={`translate(0 ${mix(t, motion.entrance.distance, 0)})`}
    >
      {children}
    </g>
  );
}
