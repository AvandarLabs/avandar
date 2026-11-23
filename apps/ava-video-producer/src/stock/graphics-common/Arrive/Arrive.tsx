import { match } from "ts-pattern";
import { Motion } from "../../../motion";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { ScaleArrive } from "./ScaleArrive";
import type { ReactNode } from "react";

type Props = {
  frame: number;
  at?: number;
  index?: number;
  children: ReactNode;
};
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
}: Readonly<Props>): ReactNode {
  const motion = GraphicThemeHooks.useGraphicMotion();
  const start = at + index * motion.stagger.list;
  const progress = Motion.ramp({
    frame,
    at: start,
    dur: motion.entrance.duration,
    easing: motion.entrance.easing,
  });
  return match(motion.entranceStyle)
    .with("none", () => {
      return <g opacity={frame >= start ? 1 : 0}>{children}</g>;
    })
    .with("scale", () => {
      return <ScaleArrive progress={progress}>{children}</ScaleArrive>;
    })
    .with("rise", "fade", (entranceStyle) => {
      return (
        <g
          opacity={progress}
          transform={
            entranceStyle === "rise"
              ? `translate(0 ${Motion.mix({
                  t: progress,
                  from: motion.entrance.distance,
                  to: 0,
                })})`
              : undefined
          }
        >
          {children}
        </g>
      );
    })
    .exhaustive();
}
