// Registers the bundled faces the theme's text roles name.
import "../../fonts";
import { Motion } from "../../motion";
import { useVideoMotion } from "../../videoTheme/useVideoMotion";
import { useVideoTheme } from "../../videoTheme/videoThemeHelpers";
import { CounterProgressBar } from "./CounterProgressBar";
import { MotionLabShared } from "./MotionLabShared";
import { SectionLabel } from "./SectionLabel";
import type { ReactNode } from "react";

type Props = {
  frame: number;
};
/** Demonstrates a rising total and matching progress bar in `MotionLab`. */
export function CounterCard({ frame }: Readonly<Props>): ReactNode {
  const { atomic, mantine } = useVideoTheme();
  const motion = useVideoMotion();
  const panel = MotionLabShared.usePanelStyle();
  const progress = motion.ramp(
    frame,
    MotionLabShared.COUNT_AT,
    motion.scale(MotionLabShared.FRAMES.count),
    motion.reveal.easing,
  );
  return (
    <div
      style={{
        ...panel,
        left: 804,
        top: 444,
        width: 736,
        height: 300,
        padding: mantine.spacing.sm,
      }}
    >
      <SectionLabel>COUNT TOWARD A RESULT</SectionLabel>
      <div
        style={{
          marginTop: mantine.spacing["18"],
          fontSize: mantine.fontSizes["108"],
          lineHeight: mantine.lineHeights["115"],
          fontWeight: atomic.fontWeight.semibold,
          fontVariantNumeric: "tabular-nums",
          letterSpacing: `${atomic.letterSpacing.largeCounter}em`,
        }}
      >
        {Math.round(
          Motion.mix({
            t: progress,
            from: 0,
            to: MotionLabShared.COUNT_TO,
          }),
        ).toLocaleString("en-US")}
      </div>
      <CounterProgressBar progress={progress} />
    </div>
  );
}
