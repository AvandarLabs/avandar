import { Motion } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = {
  frame: number;
  start: number;
  duration: number;
  source: {
    x: number;
    y: number;
    text: string;
  };
  itemId: string;
  x: number;
  y: number;
};
/**
 * Sequential text-only copies leave the exact source span before roles appear.
 */
export function PhraseCopy({
  frame,
  start,
  duration,
  source,
  itemId,
  x,
  y,
}: Readonly<Props>): ReactNode {
  const motion = GraphicThemeHooks.useGraphicMotion();
  const progress = motion.ramp(
    frame,
    start,
    duration - 4,
    motion.reveal.easing,
  );
  const opacity =
    motion.ramp(frame, start, motion.scale(2)) *
    (1 - motion.ramp(frame, start + duration - 2, motion.scale(2)));
  return (
    <g
      data-phrase-copy={itemId}
      opacity={opacity}
      transform={`translate(${Motion.mix({
        t: progress,
        from: source.x,
        to: x + 12,
      })} ${Motion.mix({
        t: progress,
        from: source.y,
        to: y + 53,
      })})`}
    >
      <LabelSlots labels={[[source.text, 0, 0, 230, 12, 3]]} />
    </g>
  );
}
