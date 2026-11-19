import { mix, ramp } from "../../../motion";
import { LiteralDataText } from "../../primitives/LiteralDataText/LiteralDataText";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { Input } from "./FilterSubscriptionScope.schema";
import type { ReactNode } from "react";

type Props = { frame: number; input: Input; accent: string };

/** Frames the category strip takes to slide into the socket. */
const SLIDE_FRAMES = 39;
/** The category strip moves into a fixed subscription source socket. */
export function SubscriptionSocket({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  const motion = useGraphicMotion();
  const corner = scales.corner(tokens.corner.cell);
  const socket = mix(
    ramp(frame, 51, motion.scale(SLIDE_FRAMES), motion.travel.easing),
    48,
    354,
  );
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
      <g data-filter="true" data-x={socket}>
        <StockRect
          x={socket}
          y={102}
          width={250}
          height={32}
          rx={corner}
          fill={tokens.color.elevated}
          stroke={accent}
        />
        <LiteralDataText
          value={input.selectedCategory}
          x={socket + 16}
          y={124}
        />
      </g>
    </g>
  );
}
