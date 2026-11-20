import { DrawPath } from "../../../graphics-common/DrawPath";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";
/** The link from the criterion to the replacement it selected. */
export function CriterionLink({
  frame,
  accent,
}: Readonly<{ frame: number; accent: string }>): ReactNode {
  const motion = GraphicThemeHooks.useGraphicMotion();
  return (
    <g data-criterion-link="replacement" opacity={motion.reveal(frame, 108)}>
      <DrawPath
        d="M480 145 V176 H674 V444 H624"
        frame={frame}
        at={108}
        duration={12}
        color={accent}
      />
    </g>
  );
}
