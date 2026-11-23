import { Motion } from "../../../../motion";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { ByteItemLabels } from "../ByteItemLabels";
import { CountTab } from "./CountTab";
import type { Input } from "../EqualCountUnequalVolume.schema";
import type { ReactNode } from "react";

type Props = {
  item: Input["groups"][number]["items"][number];
  input: Input;
  x: number;
  y: number;
  frame: number;
  accent: string;
};
/** Frames each byte strip takes to unfold to its measured width. */
const UNFOLD_FRAMES = 61;
/** Zero-byte items retain their identity tab and count despite zero width. */
export function ByteItem({
  item,
  input,
  x,
  y,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const unfolding = Motion.ramp({
    frame,
    at: 49,
    dur: motion.scale(UNFOLD_FRAMES),
    easing: motion.travel.easing,
  });
  return (
    <g data-item-id={item.id} data-item-bytes={item.bytes}>
      <CountTab itemId={item.id} x={x} y={y} />
      <ByteItemLabels {...{ input, item, x, y }} />
      <rect
        data-byte-strip={item.id}
        x={440}
        y={y - 10}
        height={18}
        width={
          ((460 * item.bytes) / input.measure.scaleMaximumBytes) * unfolding
        }
        fill={accent}
      />
      <SketchedShape
        shape={{ kind: "path", d: `M${x + 365} ${y} H440` }}
        profile={tokens.sketch.shape}
        stroke={accent}
        strokeOpacity={unfolding}
      />
    </g>
  );
}
