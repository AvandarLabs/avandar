// Registers the bundled faces the theme's text roles name.
import "../../fonts";
import { useVideoMotion } from "../../videoTheme/useVideoMotion";
import { useVideoTheme } from "../../videoTheme/videoThemeHelpers";
import { MotionLabShared } from "./MotionLabShared";
import { PreviewMotionButton } from "./PreviewMotionButton";
import type { ReactNode } from "react";

type Props = { frame: number };

/** Demonstrates button press feedback and confirmation for `MotionLab`. */
export function ClickStudy({ frame }: Readonly<Props>): ReactNode {
  const { semantic, mantine } = useVideoTheme();
  const motion = useVideoMotion();
  const scene = semantic.color.scene;
  const active = motion.ramp(
    frame,
    MotionLabShared.CLICK_AT,
    motion.chip,
    motion.reveal.easing,
  );
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: 804,
          top: 800,
          fontSize: mantine.fontSizes.lg,
          color: scene.mutedForeground,
        }}
      >
        A click gets a visible response.
      </div>
      <PreviewMotionButton frame={frame} active={active} />
      <div
        style={{
          position: "absolute",
          left: 810,
          top: 866,
          fontSize: mantine.fontSizes["2xl"],
          color: scene.brandStrong,
          opacity: active,
        }}
      >
        ✓ Motion previewed
      </div>
    </>
  );
}
