import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = {
  ballotId: string;
  x: number;
  y: number;
  index: number;
  frame: number;
  unfold: number;
  color: string;
};
/** The resident's tick, marked on their turn and hidden as it unfolds. */
export function BallotMark({
  ballotId,
  x,
  y,
  index,
  frame,
  unfold,
  color,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  return (
    <g data-ballot-mark={ballotId}>
      <SketchedShape
        shape={{ kind: "path", d: `M${x + 6} ${y + 8} l4 4 l6 -7` }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={color}
        opacity={
          motion.ramp(
            frame,
            18 + index * motion.stagger.list,
            motion.press.duration,
            motion.entrance.easing,
          ) *
          (1 - unfold)
        }
      />
    </g>
  );
}
