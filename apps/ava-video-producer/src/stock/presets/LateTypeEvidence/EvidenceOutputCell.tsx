import { mix, ramp } from "../../../motion";
import { LiteralDataText } from "../../primitives/LiteralDataText/LiteralDataText";
import { StockRect } from "../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { TRANSFER_CUE } from "./evidenceTiming";
import type { Input } from "./LateTypeEvidence.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  index: number;
  frame: number;
  accent: string;
  background: string;
};
/** Frames a value takes to transfer into the output column. */
const TRANSFER_FRAMES = 28;
/**
 * Intact strings travel into retained output slots under either type policy.
 */
export function EvidenceOutputCell({
  input,
  index,
  frame,
  accent,
  background,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const value = input.values[index];
  const progress = ramp(
    frame,
    TRANSFER_CUE + index * motion.stagger.list,
    motion.scale(TRANSFER_FRAMES),
    motion.travel.easing,
  );
  const x = mix(progress, 88, 564),
    y = 225 + index * 50;
  return frame >= TRANSFER_CUE ? (
    <g data-output-value={value} x={x} y={y + 26}>
      <StockRect
        x={x - 24}
        y={y}
        width={330}
        height={42}
        fill={background}
        stroke={
          index === input.values.length - 1 ? tokens.color.highlight : accent
        }
      />
      <LiteralDataText value={value} x={x} y={y + 26} />
    </g>
  ) : undefined;
}
