import { EASE, mix, ramp } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import type { ReactNode } from "react";
type Props = {
  frame: number;
  start: number;
  duration: number;
  source: { x: number; y: number; text: string };
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
  const progress = ramp(frame, start, duration - 4, EASE.out);
  const opacity =
    ramp(frame, start, 2) * (1 - ramp(frame, start + duration - 2, 2));
  return (
    <g
      data-phrase-copy={itemId}
      opacity={opacity}
      transform={`translate(${mix(progress, source.x, x + 12)} ${mix(progress, source.y, y + 53)})`}
    >
      <LabelSlots labels={[[source.text, 0, 0, 230, 12, 3]]} />
    </g>
  );
}
