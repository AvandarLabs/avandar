import { mix, ramp } from "../../../motion";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { getJournalGeometryFromFrame } from "./getJournalGeometryFromFrame";
import {
  RECEIPT_CUE,
  RECEIPT_STAGGER_FRAMES,
  REGISTER_CUE,
} from "./journalTiming";
import { ReceiptText } from "./ReceiptText";
import type { Input } from "./JournalReceipts.schema";
import type { ReactNode } from "react";

type Props = {
  receipt: Input["receipts"][number];
  index: number;
  input: Input;
  frame: number;
  accent: string;
};
/**
 * A receipt emerges from a separate pocket and registers at its referenced
 * entry.
 */
export function ReceiptHalf({
  receipt,
  index,
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const entryIndex = input.entries.findIndex(({ id }) => {
    return id === receipt.entryId;
  });
  const { receiptX, receiptY } = getJournalGeometryFromFrame({
    index: entryIndex,
    frame,
    direction: input.foldDirection,
    motion,
  });
  // Each receipt registers on its entry's cue, as that fold starts to close.
  const leaveAt = RECEIPT_CUE + index * motion.scale(RECEIPT_STAGGER_FRAMES);
  const progress = ramp(
    frame,
    leaveAt,
    REGISTER_CUE - RECEIPT_CUE,
    motion.travel.easing,
  );
  const horizontal = input.foldDirection === "horizontal";
  const width = horizontal ? 150 : 260;
  const height = horizontal ? 104 : 62;
  const pocketX = horizontal ? 800 : 690;
  if (frame < leaveAt) {
    return undefined;
  }
  return (
    <g
      data-receipt={receipt.entryId}
      data-target-x={receiptX}
      data-target-y={receiptY}
      transform={`translate(${mix(progress, pocketX, receiptX)} ${mix(progress, 280 + index * 12, receiptY)})`}
    >
      <SketchedShape
        shape={{
          kind: "path",
          d: `M0 0 h${width} v${height} h-${width} l4 -6 l-4 -6 z`,
        }}
        profile={tokens.sketch.shape}
        fill={tokens.color.elevated}
        stroke={accent}
      />
      <ReceiptText {...{ receipt, input, accent, width }} />
    </g>
  );
}
