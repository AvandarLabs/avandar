import { useVideoMotion } from "../../../../../videoTheme/useVideoMotion";
import { DemoTheme } from "../../DemoTheme";
import { HelperDemoFrame } from "../../HelperDemoFrame/HelperDemoFrame";
import css from "./PressDemo.module.css";
import type { HelperDemoProps } from "../../helperDemo.types";
import type { ReactNode } from "react";

const PRESSES = [20, 50];

/** A button answering two presses with `press()` and returning to exactly 1. */
export function PressDemo({
  frame,
  frames,
}: Readonly<HelperDemoProps>): ReactNode {
  const motion = useVideoMotion();
  const scale = Math.min(
    ...PRESSES.map((at) => {
      return motion.press(frame, at);
    }),
  );
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label={`press(frame, at)  at = ${PRESSES.join(", ")}`}
      readouts={[
        {
          name: "scale",
          value: DemoTheme.formatReadout({ value: scale, digits: 3 }),
        },
      ]}
    >
      <div className={css.pressDemoCentered}>
        <div
          className={css.pressDemoButton}
          style={{ transform: `scale(${scale})` }}
        >
          Publish
        </div>
      </div>
    </HelperDemoFrame>
  );
}
