import { ramp } from "../../../motion";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { LedgerEntryText } from "./LedgerEntryText";
import { LedgerImpression } from "./LedgerImpression";
import type { Input } from "./OfflineLedger.schema";
import type { ReactNode } from "react";

type Props = {
  entry: Input["entries"][number];
  index: number;
  frame: number;
  accent: string;
  input: Input;
};

/** The cue the first entry is written on. */
const FIRST_WRITE_CUE = 36;
/** Frames between entries, the fixed writing cadence. */
const CADENCE_FRAMES = 16;
/** The writing mark's normalized path length, which its dash spans. */
const MARK_LENGTH = 1;
/**
 * Each writing stroke presses one persistent matching impression beneath its
 * page.
 */
export function LedgerEntry({
  entry,
  index,
  frame,
  accent,
  input,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  const motion = useGraphicMotion();
  const writeAt = FIRST_WRITE_CUE + index * CADENCE_FRAMES;
  const writing = ramp(frame, writeAt, motion.whip, motion.reveal.easing);
  const y = 196 + index * 54;
  return (
    <g>
      <g data-ledger-entry={entry.id} data-write-at={writeAt} opacity={writing}>
        <SketchedShape
          shape={{ kind: "path", d: `M208 ${y + 25} H752` }}
          profile={tokens.sketch.shape}
          stroke={tokens.color.line}
        />
        <SketchedShape
          shape={{ kind: "path", d: `M208 ${y - 8} H220` }}
          profile={tokens.sketch.shape}
          pathLength={MARK_LENGTH}
          stroke={accent}
          strokeWidth={scales.stroke(tokens.stroke.emphasis)}
          strokeDasharray={MARK_LENGTH}
          strokeDashoffset={MARK_LENGTH * (1 - writing)}
        />
        <LedgerEntryText {...{ entry, y }} showLabels={input.showLabels} />
      </g>
      <LedgerImpression
        {...{ index, frame, accent }}
        entryId={entry.id}
        isVisible={input.showStorageImpressions}
      />
    </g>
  );
}
