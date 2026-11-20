import { mix, ramp } from "../../../motion";
import { LiteralDataText } from "../../primitives/LiteralDataText/LiteralDataText";
import { StockRect } from "../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { LATE_CUE, RESOLVED_CUE, TRANSFER_CUE } from "./evidenceTiming";
import type { Input } from "./LateTypeEvidence.schema";
import type { ReactNode } from "react";

type Props = { input: Input; index: number; frame: number };
/** Frames an early value takes to arrive. */
const ARRIVAL_FRAMES = 30;
/**
 * Source strings retain lexical forms, including the arriving contradiction.
 */
export function EvidenceSourceCell({
  input,
  index,
  frame,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const value = input.values[index];
  const isLate = index === input.values.length - 1;
  const at = isLate ? LATE_CUE : 13 + index * motion.stagger.list;
  // The late value has fully arrived the frame before values transfer.
  const arrival = ramp(
    frame,
    at,
    isLate ? TRANSFER_CUE - 1 - LATE_CUE : motion.scale(ARRIVAL_FRAMES),
    motion.entrance.easing,
  );
  const y = 225 + index * 50 + (isLate ? mix(arrival, 16, 0) : 0);
  return frame >= at &&
    (frame < TRANSFER_CUE ||
      (frame >= RESOLVED_CUE && input.showOriginalStrings)) ? (
    <g
      data-source-value={value}
      data-original-value={input.showOriginalStrings ? value : undefined}
      opacity={arrival}
    >
      <StockRect
        data-late-cell={isLate ? "" : undefined}
        x={64}
        y={y}
        width={330}
        height={42}
        fill="none"
        stroke={isLate ? tokens.color.highlight : tokens.color.line}
      />
      <LiteralDataText value={value} x={88} y={y + 26} />
    </g>
  ) : undefined;
}
