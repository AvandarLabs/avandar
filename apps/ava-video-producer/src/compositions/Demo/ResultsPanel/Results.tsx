import { abs } from "../../../chrome/abs";
import { useVideoMotion } from "../../../videoTheme/useVideoMotion";
import { useVideoShapeScales } from "../../../videoTheme/useVideoShapeScales";
import { useVideoTheme } from "../../../videoTheme/useVideoTheme";
import { RESULTS, ROWS, ROWS_AT } from "../timeline";
import { ResultRow } from "./ResultRow";
import { ResultsPanelShared } from "./ResultsPanelShared/ResultsPanelShared";
import { ResultsTotal } from "./ResultsTotal";
import type { ReactNode } from "react";
/** Builds the channel breakdown and its total for `ResultsPanel`. */
export function Results({
  frame,
  totalShown,
}: {
  frame: number;
  totalShown: number;
}): ReactNode {
  const { semantic, mantine } = useVideoTheme();
  const motion = useVideoMotion();
  const scales = useVideoShapeScales();
  const scene = semantic.color.scene;
  const hairline = `${scales.stroke(semantic.stroke.hairline)}px solid ${scene.border}`;
  return (
    <div
      style={{
        ...abs(RESULTS),
        borderRadius: scales.corner(semantic.corner.scene),
        border: hairline,
        background: scene.card,
        padding: mantine.spacing["28"],
        ...motion.enter(frame, ROWS_AT, {
          dur: motion.sheet,
          y: ResultsPanelShared.RISE.panel,
          scale: ResultsPanelShared.PANEL_START_SCALE,
        }),
      }}
    >
      <div
        style={{ fontSize: mantine.fontSizes.sm, color: scene.mutedForeground }}
      >
        CHANNEL BREAKDOWN
      </div>

      {ROWS.map((row, index) => {
        return (
          <ResultRow key={row.label} frame={frame} row={row} index={index} />
        );
      })}

      {/* The list needs a bottom. A panel whose content stops halfway
       * down reads as a render that failed, not as a design. It also
       * arrives last, after the rows it is summing: a total that
       * appears before its own operands is a small lie the eye
       * catches without being able to name. */}
      <ResultsTotal frame={frame} totalShown={totalShown} rule={hairline} />
    </div>
  );
}
