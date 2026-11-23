import { useVideoMotion } from "../../videoTheme/useVideoMotion";
import { useVideoShapeScales } from "../../videoTheme/useVideoShapeScales";
import { useVideoTheme } from "../../videoTheme/videoThemeHelpers";
import { RUN_CLICK } from "./timeline";
import type { ReactNode } from "react";

type Props = { frame: number };
/** Draws the Run button with its frame-driven press feedback. */
export function RunPromptButton({ frame }: Readonly<Props>): ReactNode {
  const { semantic, mantine, atomic } = useVideoTheme();
  const scene = semantic.color.scene;
  const motion = useVideoMotion();
  const scales = useVideoShapeScales();
  return (
    <div
      style={{
        marginLeft: "auto",
        padding: `${mantine.spacing["12"]} ${mantine.spacing["28"]}`,
        borderRadius: scales.corner(semantic.corner.label),
        fontSize: mantine.fontSizes["19"],
        fontWeight: atomic.fontWeight.semibold,
        color: mantine.white,
        background: scene.brand,
        // A press that answers back, and lands on exactly 1 so no
        // frame outside the beat is left transformed.
        transform: `scale(${motion.press(frame, RUN_CLICK).toFixed(4)})`,
      }}
    >
      Run
    </div>
  );
}
