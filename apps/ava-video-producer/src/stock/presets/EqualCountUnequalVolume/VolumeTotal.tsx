import { ramp } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { useGraphicMotion } from "../../theme/useGraphicTheme/useGraphicTheme";
import { getByteLabelFromBytes } from "./getByteLabelFromBytes";
import type { Input } from "./EqualCountUnequalVolume.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  group: Input["groups"][number];
  frame: number;
  y: number;
};

/** Frames a shelf total takes to fade in. */
const TOTAL_FRAMES = 34;
/** Exact collection sum shown in the authored common display unit. */
export function VolumeTotal({
  input,
  group,
  frame,
  y,
}: Readonly<Props>): ReactNode {
  const motion = useGraphicMotion();
  const total = group.items.reduce((sum, item) => {
    return sum + item.bytes;
  }, 0);
  return frame >= 111 ? (
    <g
      opacity={ramp(
        frame,
        111,
        motion.scale(TOTAL_FRAMES),
        motion.reveal.easing,
      )}
      data-total-bytes={total}
    >
      <LabelSlots
        labels={[
          [input.copy.total, 55, y + 178, 370, 12, 1],
          [
            getByteLabelFromBytes({
              bytes: total,
              displayUnit: input.measure.displayUnit,
            }),
            440,
            y + 178,
            460,
            12,
            1,
          ],
        ]}
      />
    </g>
  ) : null;
}
