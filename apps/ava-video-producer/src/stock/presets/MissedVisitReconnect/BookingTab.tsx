import { mix } from "../../../motion";
import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "./MissedVisitReconnect.schema";
import type { ReactNode } from "react";

type Props = {
  item: Input["cases"][number];
  index: number;
  y: number;
  frame: number;
  accent: string;
};
/** A booking tab travels to the calendar and folds its own corner. */
export function BookingTab({
  item,
  index,
  y,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const progress = motion.ramp(
    frame,
    79 + index * motion.stagger.list,
    motion.scale(14),
    motion.entrance.easing,
  );
  const fold = mix(progress, 0, 14);
  return (
    <g
      data-booking={item.id}
      opacity={motion.ramp(
        frame,
        79 + index * motion.stagger.list,
        motion.whip,
        motion.reveal.easing,
      )}
      transform={`translate(${mix(progress, 310, 560)} ${y})`}
    >
      <SketchedShape
        shape={{
          kind: "path",
          d: `M0 -14 h${74 - fold} l${fold} ${fold} V16 H0 Z M${74 - fold} -14 v${fold} h${fold}`,
        }}
        profile={tokens.sketch.shape}
        fill={tokens.color.surface}
        stroke={accent}
      />
    </g>
  );
}
