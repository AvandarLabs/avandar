// Registers the bundled faces the theme's text roles name.
import "../../fonts";
import { Motion } from "../../motion";
import { useVideoMotion } from "../../videoTheme/useVideoMotion";
import { useVideoTheme } from "../../videoTheme/videoThemeHelpers";
import { MotionLabShared } from "./MotionLabShared";
import { SectionLabel } from "./SectionLabel";
import type { ReactNode } from "react";

type Props = {
  frame: number;
};
/** Demonstrates a sentence appearing character by character in `MotionLab`. */
export function TypedCard({ frame }: Readonly<Props>): ReactNode {
  const { mantine } = useVideoTheme();
  const motion = useVideoMotion();
  const panel = MotionLabShared.usePanelStyle();
  return (
    <div
      style={{
        ...panel,
        left: 804,
        top: 212,
        width: 736,
        height: 204,
        padding: mantine.spacing.sm,
      }}
    >
      <SectionLabel>TYPE A THOUGHT</SectionLabel>
      <div
        style={{
          marginTop: mantine.spacing["38"],
          fontSize: mantine.fontSizes["8xl"],
        }}
      >
        {Motion.typed({
          frame,
          at: MotionLabShared.TYPE_AT,
          text: "Ask a question. Show the answer.",
          cps: motion.typing.rate,
        })}
      </div>
    </div>
  );
}
