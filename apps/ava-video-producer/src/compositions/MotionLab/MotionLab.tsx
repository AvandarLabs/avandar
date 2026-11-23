import { AbsoluteFill, useCurrentFrame } from "remotion";
import { AppFrame, Cursor } from "../../chrome/chrome";
import { MOTION_LAB_LEN } from "../../composition-timing";
import { useVideoMotion } from "../../videoTheme/useVideoMotion";
// Registers the bundled faces the theme's text roles name.
import "../../fonts";
import { useVideoTheme } from "../../videoTheme/videoThemeHelpers";
import { BuildingBlocks } from "./BuildingBlocks";
import { ClickStudy } from "./ClickStudy";
import { CounterCard } from "./CounterCard";
import layoutClasses from "./MotionLab.module.css";
import { MotionLabShared } from "./MotionLabShared";
import { SectionLabel } from "./SectionLabel";
import { TypedCard } from "./TypedCard";
import type { ReactNode } from "react";

export { MOTION_LAB_LEN } from "../../composition-timing";
/* ------------------------------------------------------------ beat sheet -- */
const APP_IN = 0;
const OUT_AT = 260;
const POINTER = [
  { at: 0, x: 1480, y: 750 },
  { at: 160, x: 1480, y: 750 },
  { at: 180, x: 1260, y: 861 },
  { at: MOTION_LAB_LEN, x: 1260, y: 861 },
];
/**
 * Four building blocks of the motion vocabulary, drawn in the video theme:
 * the scene palette, theme type steps, corners and strokes through the
 * Look and feel scales, and themed motion. Draw it inside a theme.
 */
export function MotionLab(): ReactNode {
  const frame = useCurrentFrame();
  const { semantic } = useVideoTheme();
  const motion = useVideoMotion();
  const scene = semantic.color.scene;
  const easing = motion.entrance.easing;
  const { appIn, appOut } = MotionLabShared.FRAMES;
  const visibility = Math.min(
    motion.ramp(frame, APP_IN, motion.scale(appIn), easing),
    1 - motion.ramp(frame, OUT_AT, motion.scale(appOut), easing),
  );
  return (
    <AbsoluteFill style={{ background: scene.ground }}>
      <AbsoluteFill
        style={{
          opacity: visibility,
          background: scene.background,
          fontFamily: semantic.text.stage.appBody.fontFamily,
          color: scene.foreground,
        }}
      >
        <AppFrame
          w={1600}
          title="Starter / motion studies"
          heading="Motion vocabulary"
          sub="The same helpers that power the original demo"
        />
        <SectionLabel className={layoutClasses.motionLabPositionedContent}>
          FOUR BUILDING BLOCKS
        </SectionLabel>
        <BuildingBlocks frame={frame} />
        <TypedCard frame={frame} />
        <CounterCard frame={frame} />
        <ClickStudy frame={frame} />
        <Cursor
          frame={frame}
          path={POINTER}
          clicks={[MotionLabShared.CLICK_AT]}
          cursor={frame >= 180 ? "pointer" : "default"}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
