import { Motion } from "../../../../motion";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { VolumeTotal } from "../VolumeTotal";
import { VolumeGroupLabels } from "./VolumeGroupLabels";
import type { Input } from "../EqualCountUnequalVolume.schema";
import type { ReactNode } from "react";

type Props = {
  group: Input["groups"][number];
  input: Input;
  index: number;
  frame: number;
  accent: string;
};

/** Frames the shelves take to align on the shared ruler. */
const ALIGN_FRAMES = 36;

/** A shelf preserves item ownership and uses the shared byte ruler. */
export function VolumeShelf({
  group,
  input,
  index,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const motion = GraphicThemeHooks.useGraphicMotion();
  const y = 135 + index * 200;
  const alignment = Motion.ramp({
    frame,
    at: 12,
    dur: motion.scale(ALIGN_FRAMES),
    easing: motion.travel.easing,
  });
  return (
    <g
      data-group-id={group.id}
      data-item-count={group.items.length}
      data-scale-bytes={input.measure.scaleMaximumBytes}
    >
      <VolumeGroupLabels
        group={group}
        input={input}
        index={index}
        frame={frame}
        accent={accent}
        y={y}
        alignment={alignment}
      />
      <VolumeTotal {...{ input, group, frame, y }} />
    </g>
  );
}
