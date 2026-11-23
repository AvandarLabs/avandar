import { Motion } from "../../../../motion";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { LATE_CUE, RESOLVED_CUE, TRANSFER_CUE } from "../evidenceTiming";
import { EvidenceSourceCellSourceValue } from "./EvidenceSourceCellSourceValue";
import type { Input } from "../LateTypeEvidence.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  index: number;
  frame: number;
};

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
  const arrival = Motion.ramp({
    frame,
    at,
    dur: isLate ? TRANSFER_CUE - 1 - LATE_CUE : motion.scale(ARRIVAL_FRAMES),
    easing: motion.entrance.easing,
  });
  const y =
    225 +
    index * 50 +
    (isLate
      ? Motion.mix({
          t: arrival,
          from: 16,
          to: 0,
        })
      : 0);
  return frame >= at &&
    (frame < TRANSFER_CUE ||
      (frame >= RESOLVED_CUE && input.showOriginalStrings)) ? (
    <EvidenceSourceCellSourceValue
      input={input}
      tokens={tokens}
      value={value}
      isLate={isLate}
      arrival={arrival}
      y={y}
    />
  ) : undefined;
}
