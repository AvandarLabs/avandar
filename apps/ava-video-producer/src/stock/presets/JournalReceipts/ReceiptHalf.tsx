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
import type { VideoMotion } from "../../../videoTheme/createVideoMotion/createVideoMotion";
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
  const { leaveAt, progress } = _getReceiptTravel(frame, index, motion);
  const { width, height, pocketX } = _getReceiptSize(input.foldDirection);
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

/** A receipt's size and the pocket it leaves from, by fold direction. */
function _getReceiptSize(foldDirection: Input["foldDirection"]) {
  const horizontal = foldDirection === "horizontal";
  return {
    width: horizontal ? 150 : 260,
    height: horizontal ? 104 : 62,
    pocketX: horizontal ? 800 : 690,
  };
}

/**
 * When a receipt leaves its pocket and how far it has travelled, 0 to 1. Each
 * receipt registers on its entry's cue, as that fold starts to close.
 */
function _getReceiptTravel(frame: number, index: number, motion: VideoMotion) {
  const leaveAt =
    RECEIPT_CUE + index * motion.scaleStagger(RECEIPT_STAGGER_FRAMES);
  return {
    leaveAt,
    progress: ramp(
      frame,
      leaveAt,
      REGISTER_CUE - RECEIPT_CUE,
      motion.travel.easing,
    ),
  };
}
