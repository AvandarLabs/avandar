import { Motion } from "../../../../motion";
import { LabelSlots } from "../../../primitives/LabelSlots/LabelSlots";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = {
  label: string;
  x: number;
  width: number;
  frame: number;
};
/** The heading copied into the snapshot, settling onto its row. */
export function SnapshotHeading({
  label,
  x,
  width,
  frame,
}: Readonly<Props>): ReactNode {
  const motion = GraphicThemeHooks.useGraphicMotion();
  return (
    <g opacity={motion.ramp(frame, 56, motion.scale(1))}>
      <LabelSlots
        labels={[
          [
            label,
            x,
            Motion.mix({
              t: motion.ramp(frame, 92, motion.scale(3), motion.travel.easing),
              from: 156,
              to: 176,
            }),
            width,
            12,
            4,
          ],
        ]}
      />
    </g>
  );
}
