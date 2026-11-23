import { Motion } from "../../../../motion";
import { StockRect } from "../../../primitives/StockRect";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { SubscriptionSocketFilter } from "./SubscriptionSocketFilter";
import type { Input } from "../FilterSubscriptionScope.schema";
import type { ReactNode } from "react";

type Props = {
  frame: number;
  input: Input;
  accent: string;
};

/** Frames the category strip takes to slide into the socket. */
const SLIDE_FRAMES = 39;

/** The category strip moves into a fixed subscription source socket. */
export function SubscriptionSocket({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const corner = scales.corner(tokens.corner.cell);
  const socket = Motion.mix({
    t: Motion.ramp({
      frame,
      at: 51,
      dur: motion.scale(SLIDE_FRAMES),
      easing: motion.travel.easing,
    }),
    from: 48,
    to: 354,
  });
  return (
    <g>
      <StockRect
        data-filter-socket="true"
        x={354}
        y={102}
        width={250}
        height={32}
        rx={corner}
        fill="none"
        stroke={tokens.color.line}
      />
      <SubscriptionSocketFilter
        input={input}
        accent={accent}
        tokens={tokens}
        corner={corner}
        socket={socket}
      />
    </g>
  );
}
