import { propEq } from "@avandar/utils";
import { Motion } from "../../../../motion";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { getJournalGeometryFromFrame } from "../getJournalGeometryFromFrame";
import { RECEIPT_STAGGER_FRAMES, REGISTER_CUE } from "../journalTiming";
import { JournalFoldFace } from "./JournalFoldFace";
import type { VideoMotion } from "../../../../videoTheme/makeVideoMotionFromTokens/makeVideoMotionFromTokens";
import type { Input } from "../JournalReceipts.schema";
import type { ReactNode } from "react";

type GetClosingProgressOptions = {
  frame: number;
  input: Readonly<Input>;
  entryId: string;
  motion: VideoMotion;
};

type Props = {
  entry: Input["entries"][number];
  index: number;
  input: Input;
  frame: number;
  accent: string;
};

type ClosingOptions = {
  entry: Readonly<Props>["entry"];
  index: Readonly<Props>["index"];
  input: Readonly<Props>["input"];
  frame: Readonly<Props>["frame"];
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
};

type ClosingResult = {
  closing: number;
  rise: number;
  horizontal: boolean;
  x: ReturnType<typeof getJournalGeometryFromFrame>["x"];
  y: ReturnType<typeof getJournalGeometryFromFrame>["y"];
  width: ReturnType<typeof getJournalGeometryFromFrame>["width"];
  height: ReturnType<typeof getJournalGeometryFromFrame>["height"];
  receiptX: ReturnType<typeof getJournalGeometryFromFrame>["receiptX"];
  receiptY: ReturnType<typeof getJournalGeometryFromFrame>["receiptY"];
};

function _getClosingProgress({
  frame,
  input,
  entryId,
  motion,
}: GetClosingProgressOptions): number {
  const receiptIndex = input.receipts.findIndex(propEq("entryId", entryId));
  return receiptIndex < 0
    ? 0
    : Motion.ramp({
        frame,
        at:
          REGISTER_CUE +
          receiptIndex * motion.scaleStagger(RECEIPT_STAGGER_FRAMES),
        dur: motion.whip,
        easing: motion.entrance.easing,
      });
}

/** Samples the journal tab closing state for the current authored frame. */
function _getJournalTabClosingState({
  entry,
  index,
  input,
  frame,
  motion,
}: Readonly<ClosingOptions>): ClosingResult {
  const geometry = getJournalGeometryFromFrame({
    index,
    frame,
    direction: input.foldDirection,
    motion,
  });
  const closing = _getClosingProgress({
    frame,
    input,
    entryId: entry.id,
    motion,
  });
  const rise = 28 * (1 - closing);
  const horizontal = input.foldDirection === "horizontal";
  const { x, y, width, height, receiptX, receiptY } = geometry;
  return { closing, rise, horizontal, x, y, width, height, receiptX, receiptY };
}

/** An unmatched fold stays raised even after every supplied receipt arrives. */
export function JournalTab({
  entry,
  index,
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const { closing, rise, horizontal, x, y, width, height, receiptX, receiptY } =
    _getJournalTabClosingState({ entry, index, input, frame, motion });
  return (
    <g
      data-journal-entry={entry.id}
      data-tab-rise={rise}
      data-target-x={receiptX}
      data-target-y={receiptY}
      transform={`translate(${x} ${y})`}
    >
      <JournalFoldFace
        entry={entry}
        input={input}
        frame={frame}
        accent={accent}
        tokens={tokens}
        closing={closing}
        rise={rise}
        horizontal={horizontal}
        width={width}
        height={height}
      />
      <circle
        cx={width - 12}
        cy={height - 12}
        r={3}
        fill={closing === 1 ? accent : tokens.color.highlight}
      />
    </g>
  );
}
