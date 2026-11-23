import { Motion } from "../../../../motion";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { AlternativePanel } from "./AlternativePanel";
import { type Props } from "./ContrastAlternativeShared.types";
import type { ReactNode } from "react";
/** Frames the halves take to slide apart. */
const SEPARATE_FRAMES = 24;
/** Equal halves slide apart while their labels keep the same fixed size. */
export function ContrastAlternative({
  frame,
  accent,
  alternative,
  index,
}: Readonly<Props>): ReactNode {
  const motion = GraphicThemeHooks.useGraphicMotion();
  const separation = Motion.ramp({
    frame,
    at: 12,
    dur: motion.scale(SEPARATE_FRAMES),
    easing: motion.travel.easing,
  });
  return (
    <g
      data-alternative={alternative.id}
      opacity={separation}
      transform={`translate(${Motion.mix({
        t: separation,
        from: index ? -100 : 100,
        to: 0,
      })} 0)`}
    >
      <AlternativePanel
        alternative={alternative}
        index={index}
        accent={accent}
      />
    </g>
  );
}
