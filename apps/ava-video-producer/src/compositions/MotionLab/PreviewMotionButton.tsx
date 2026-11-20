// Registers the bundled faces the theme's text roles name.
import "../../fonts";
import { mixToken } from "../../motion";
import { useVideoMotion } from "../../videoTheme/useVideoMotion";
import { useVideoShapeScales } from "../../videoTheme/useVideoShapeScales";
import { useVideoTheme } from "../../videoTheme/useVideoTheme";
import { MotionLabShared } from "./MotionLabShared/MotionLabShared";
import type { ReactNode } from "react";
/** The button the click study presses, softening to its brand once active. */
export function PreviewMotionButton({
  frame,
  active,
}: {
  frame: number;
  active: number;
}): ReactNode {
  const { semantic, mantine, atomic } = useVideoTheme();
  const motion = useVideoMotion();
  const scales = useVideoShapeScales();
  const scene = semantic.color.scene;
  return (
    <div
      style={{
        position: "absolute",
        left: 1110,
        top: 824,
        width: 340,
        height: 74,
        borderRadius: scales.corner(semantic.corner.card),
        background: mixToken(active, scene.brand, scene.brandSoft),
        border: `${scales.stroke(semantic.stroke.hairline)}px solid ${scene.brand}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: mantine.fontSizes["7xl"],
        fontWeight: atomic.fontWeight.semibold,
        transform: `scale(${motion.press(frame, MotionLabShared.CLICK_AT)})`,
      }}
    >
      Preview motion
    </div>
  );
}
