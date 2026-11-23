import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = {
  slotId: string;
  path: string;
  frame: number;
  index: number;
  accent: string;
};
/** The dashed connector from a booked person to their appointment tab. */
export function BookingConnector({
  slotId,
  path,
  frame,
  index,
  accent,
}: Readonly<Props>): ReactNode {
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  return (
    <g data-booking={slotId}>
      <SketchedShape
        shape={{ kind: "path", d: path }}
        profile={tokens.sketch.shape}
        stroke={accent}
        fill="none"
        opacity={motion.ramp(
          frame,
          96 + index,
          motion.scale(10),
          motion.reveal.easing,
        )}
        strokeDasharray={atomic.dash.medium.join(" ")}
      />
    </g>
  );
}
