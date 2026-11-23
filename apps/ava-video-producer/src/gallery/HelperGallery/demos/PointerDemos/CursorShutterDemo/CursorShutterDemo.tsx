import { Cursor } from "../../../../../chrome/Cursor/Cursor";
import { useCursorMotion } from "../../../../../chrome/useCursorMotion";
import { CursorMotionHelpers } from "../../../../../CursorMotionHelpers";
import { useVideoMotion } from "../../../../../videoTheme/useVideoMotion";
import { DemoTheme } from "../../DemoTheme";
import { HelperDemoFrame } from "../../HelperDemoFrame/HelperDemoFrame";
import { ShutterInset } from "../ShutterInset/ShutterInset";
import css from "./CursorShutterDemo.module.css";
import type { CursorKey } from "../../../../../CursorMotionHelpers";
import type { HelperDemoProps } from "../../helperDemo.types";
import type { ReactNode } from "react";

const FAST_PATH: CursorKey[] = [
  { at: 0, x: 140, y: 340 },
  { at: 20, x: 140, y: 340 },
  { at: 30, x: 700, y: 120 },
  { at: 55, x: 700, y: 120 },
  { at: 65, x: 140, y: 340 },
];

/** Renders CursorShutterDemo for live helper catalog previews. */
export function CursorShutterDemo({
  frame,
  frames,
}: Readonly<Props>): ReactNode {
  const motion = useVideoMotion();
  const samples = CursorMotionHelpers.cursorShutter({
    frame,
    path: FAST_PATH,
    motion: useCursorMotion(),
  });
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label={"CursorMotionHelpers.cursorShutter({ frame, path })"}
      readouts={samples.map((sample, index) => {
        return {
          name: `sample ${index}`,
          value: `${DemoTheme.formatReadout({
            value: Math.hypot(sample.x, sample.y),
            digits: 1,
          })}px · ${sample.opacity}`,
        };
      })}
    >
      <ShutterInset samples={samples} />
      <Cursor frame={frame} path={FAST_PATH} />
      <span
        className={css.cursorShutterDemoFootnote}
        style={{
          opacity: motion.ramp(frame, 0, motion.chip, motion.reveal.easing),
        }}
      >
        Inset: shutter samples relative to the pointer, enlarged
      </span>
    </HelperDemoFrame>
  );
}

type Props = HelperDemoProps;
