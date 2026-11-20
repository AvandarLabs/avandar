import { useVideoMotion } from "../../../videoTheme/useVideoMotion";
import { useVideoShapeScales } from "../../../videoTheme/useVideoShapeScales";
import { useVideoTheme } from "../../../videoTheme/useVideoTheme";
import { ROWS_AT } from "../timeline";
import { SidePanelShared } from "./SidePanelShared/SidePanelShared";
import { TopChannelValue } from "./TopChannelValue/TopChannelValue";
import type { ReactNode } from "react";
/**
 * Shows the period and current top channel beneath the count for `SidePanel`.
 */
export function Facts({
  frame,
  refilter,
}: {
  frame: number;
  refilter: number;
}): ReactNode {
  const { semantic, mantine } = useVideoTheme();
  const motion = useVideoMotion();
  const scales = useVideoShapeScales();
  const scene = semantic.color.scene;
  const facts: Array<[string, ReactNode]> = [
    ["Top channel", <TopChannelValue refilter={refilter} />],
    ["Period", "Q3 2026"],
  ];
  return facts.map(([name, value], index) => {
    return (
      <div
        key={name}
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: mantine.fontSizes.lg,
          marginTop: mantine.spacing.xs,
          paddingTop: mantine.spacing.xs,
          borderTop: `${scales.stroke(semantic.stroke.hairline)}px solid ${scene.border}`,
          ...motion.enterAt(
            frame,
            ROWS_AT + SidePanelShared.CUES.facts,
            index,
            { y: SidePanelShared.RISE.fact },
          ),
        }}
      >
        <span style={{ color: scene.mutedForeground }}>{name}</span>
        <span>{value}</span>
      </div>
    );
  });
}
