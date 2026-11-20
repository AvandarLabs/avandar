import { mix, ramp } from "../../motion";
import { useGraphicMotion } from "../theme/useGraphicTheme/useGraphicTheme";
import type { ReactNode } from "react";

/** The starting scale of an entrance whose theme style is `scale`. */
const SCALE_STYLE_START = 0.96;

/**
 * Fades children in with the theme's entrance motion and entrance style: a
 * rise, a plain fade, a scale up about the children's own centre, or a cut
 * on the cue.
 */
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
  const start = at + index * motion.stagger.list;
  const style = motion.entranceStyle;
  if (style === "none") {
    return <g opacity={frame >= start ? 1 : 0}>{children}</g>;
  }
  const t = ramp(
    frame,
    start,
    motion.entrance.duration,
    motion.entrance.easing,
  );
  if (style === "scale") {
    return <ScaleArrive progress={t}>{children}</ScaleArrive>;
  }
  return (
    <g
      opacity={t}
      transform={
        style === "rise"
          ? `translate(0 ${mix(t, motion.entrance.distance, 0)})`
          : undefined
      }
    >
      {children}
    </g>
  );
}

/** An entrance that scales up about the children's own centre. */
function ScaleArrive({
  progress,
  children,
}: {
  progress: number;
  children: ReactNode;
}): ReactNode {
  return (
    <g
      opacity={progress}
      style={{
        transformBox: "fill-box",
        transformOrigin: "center",
        transform: `scale(${mix(progress, SCALE_STYLE_START, 1)})`,
      }}
    >
      {children}
    </g>
  );
}
