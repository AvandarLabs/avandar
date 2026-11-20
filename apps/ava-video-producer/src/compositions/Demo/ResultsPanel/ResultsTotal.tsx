import { useVideoMotion } from "../../../videoTheme/useVideoMotion";
import { useVideoTheme } from "../../../videoTheme/useVideoTheme";
import { ROWS_AT } from "../timeline";
import { ResultsPanelShared } from "./ResultsPanelShared/ResultsPanelShared";
import type { ReactNode } from "react";
/** Introduces the formatted sum beneath the channel breakdown for `Results`. */
export function ResultsTotal({
  frame,
  totalShown,
  rule,
}: {
  frame: number;
  totalShown: number;
  rule: string;
}): ReactNode {
  const { semantic, mantine, atomic } = useVideoTheme();
  const motion = useVideoMotion();
  return (
    <div
      style={{
        marginTop: mantine.spacing["30"],
        paddingTop: mantine.spacing.xs,
        borderTop: rule,
        display: "flex",
        justifyContent: "space-between",
        fontSize: mantine.fontSizes["19"],
        ...motion.enter(frame, ROWS_AT + ResultsPanelShared.CUES.total, {
          y: ResultsPanelShared.RISE.total,
        }),
      }}
    >
      <span style={{ color: semantic.color.scene.mutedForeground }}>Total</span>
      <span style={{ fontWeight: atomic.fontWeight.semibold }}>
        {totalShown.toLocaleString("en-US")}
      </span>
    </div>
  );
}
