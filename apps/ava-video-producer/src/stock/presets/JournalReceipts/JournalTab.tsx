import { propEq } from "@avandar/utils";
import { ramp } from "../../../motion";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { getJournalGeometryFromFrame } from "./getJournalGeometryFromFrame";
import { JournalEntryText } from "./JournalEntryText";
import { RECEIPT_STAGGER_FRAMES, REGISTER_CUE } from "./journalTiming";
import type { VideoMotion } from "../../../videoTheme/createVideoMotion/createVideoMotion";
import type { Input } from "./JournalReceipts.schema";
import type { ReactNode } from "react";

type Props = {
  entry: Input["entries"][number];
  index: number;
  input: Input;
  frame: number;
  accent: string;
};

function _getClosingProgress({
  frame,
  input,
  entryId,
  motion,
}: {
  frame: number;
  input: Readonly<Input>;
  entryId: string;
  motion: VideoMotion;
}): number {
  const receiptIndex = input.receipts.findIndex(propEq("entryId", entryId));
  return receiptIndex < 0
    ? 0
    : ramp(
        frame,
        REGISTER_CUE + receiptIndex * motion.scale(RECEIPT_STAGGER_FRAMES),
        motion.whip,
        motion.entrance.easing,
      );
}

/** An unmatched fold stays raised even after every supplied receipt arrives. */
export function JournalTab({
  entry,
  index,
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
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
  return (
    <g
      data-journal-entry={entry.id}
      data-tab-rise={rise}
      data-target-x={receiptX}
      data-target-y={receiptY}
      transform={`translate(${x} ${y})`}
    >
      <SketchedShape
        shape={{ kind: "path", d: `M0 0 h${width} v${height} h-${width} z` }}
        profile={tokens.sketch.shape}
        fill={tokens.color.surface}
        stroke={tokens.color.line}
      />
      <g data-fold-face={entry.id}>
        <SketchedShape
          shape={{
            kind: "path",
            d: horizontal
              ? `M0 0 l12 ${-rise} h${width - 24} l12 ${rise} z`
              : `M0 0 l${-rise} 10 v${height - 20} l${rise} 10 z`,
          }}
          profile={tokens.sketch.shape}
          fill={tokens.color.elevated}
          stroke={closing === 1 ? accent : tokens.color.highlight}
        />
      </g>
      <JournalEntryText {...{ entry, input, frame }} />
      <circle
        cx={width - 12}
        cy={height - 12}
        r={3}
        fill={closing === 1 ? accent : tokens.color.highlight}
      />
    </g>
  );
}
