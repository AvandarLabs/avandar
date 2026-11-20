import { mix } from "../../../motion";
import { useVideoMotion } from "../../../videoTheme/useVideoMotion";
import { useVideoTheme } from "../../../videoTheme/useVideoTheme";
import { ROWS_AT } from "../timeline";
import { ResultRowBar } from "./ResultRowBar";
import { ResultRowLabel } from "./ResultRowLabel";
import { ResultsPanelShared } from "./ResultsPanelShared/ResultsPanelShared";
import { type ResultRowData } from "./ResultsPanelShared/ResultsPanelShared.types";
import type { ReactNode } from "react";
/**
 * Animates one channel's count and bar while dimming excluded rows for
 * `Results`.
 */
export function ResultRow({
  frame,
  row,
  index,
}: {
  frame: number;
  row: ResultRowData;
  index: number;
}): ReactNode {
  const { mantine, atomic } = useVideoTheme();
  const motion = useVideoMotion();
  // Nothing enters as a group. Two frames between siblings is the minimum
  // that reads as a list assembling rather than as a block being pasted in.
  const { grow, cut } = ResultsPanelShared.rowProgress({
    frame,
    index,
    isPaid: row.paid,
    motion,
  });
  const entrance = motion.enterAt(
    frame,
    ROWS_AT + ResultsPanelShared.CUES.rows,
    index,
    { y: ResultsPanelShared.RISE.row },
  );
  return (
    <div
      style={{
        marginTop: mantine.spacing["34"],
        ...entrance,
        // Dimmed, not removed. A row that vanishes takes its slot with it
        // and the four below jump up a line; leaving it at a quarter says
        // "excluded" without moving anything.
        opacity:
          (entrance.opacity as number) * mix(cut, 1, atomic.opacity["26"]),
      }}
    >
      <ResultRowLabel row={row} />
      <ResultRowBar row={row} grow={grow} cut={cut} />
    </div>
  );
}
