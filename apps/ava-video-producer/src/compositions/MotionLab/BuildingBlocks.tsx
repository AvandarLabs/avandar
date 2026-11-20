// Registers the bundled faces the theme's text roles name.
import "../../fonts";
import { useVideoMotion } from "../../videoTheme/useVideoMotion";
import { useVideoTheme } from "../../videoTheme/useVideoTheme";
import { BuildingBlockText } from "./BuildingBlockText";
import { MotionLabShared } from "./MotionLabShared/MotionLabShared";
import type { ReactNode } from "react";
/** Staggers the numbered motion-principle cards into view for `MotionLab`. */
export function BuildingBlocks({ frame }: { frame: number }): ReactNode {
  const { mantine } = useVideoTheme();
  const motion = useVideoMotion();
  const panel = MotionLabShared.usePanelStyle();
  return MotionLabShared.ITEMS.map(([number, title, detail], index) => {
    return (
      <div
        key={number}
        style={{
          ...panel,
          left: 60,
          top: 212 + index * 170,
          width: 704,
          height: 146,
          padding: mantine.spacing["28"],
          display: "flex",
          alignItems: "center",
          gap: mantine.spacing["26"],
          ...motion.enterAt(frame, MotionLabShared.ROWS_AT, index, {
            y: motion.entrance.distance,
            dur: motion.reveal.duration,
          }),
        }}
      >
        <BuildingBlockText number={number} title={title} detail={detail} />
      </div>
    );
  });
}
