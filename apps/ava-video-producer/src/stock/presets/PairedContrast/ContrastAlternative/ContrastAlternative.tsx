import { mix, ramp } from "../../../../motion";
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
  const separation = ramp(
    frame,
    12,
    motion.scale(SEPARATE_FRAMES),
    motion.travel.easing,
  );
  return (
    <g
      data-alternative={alternative.id}
      opacity={separation}
      transform={`translate(${mix(separation, index ? -100 : 100, 0)} 0)`}
    >
      <AlternativePanel
        alternative={alternative}
        index={index}
        accent={accent}
      />
    </g>
  );
}
