import { Motion } from "../../../../../motion";
import { useWindowStage } from "../../../../../scenes/TiltedWindowScene/useWindowStage";
import { WindowMotion } from "../../../../../scenes/TiltedWindowScene/WindowMotion/WindowMotion";
import { DemoTheme } from "../../DemoTheme";
import { HelperDemoFrame } from "../../HelperDemoFrame/HelperDemoFrame";
import { DemoWindow } from "../../parts/DemoWindow/DemoWindow";
import css from "./ScrollOffsetDemo.module.css";
import type { HelperDemoProps } from "../../helperDemo.types";
import type { ReactNode } from "react";

const SCROLL_STEPS = [
  { atFrame: 30, offset: 1 / 3 },
  { atFrame: 60, offset: 2 / 3 },
];

/** Renders ScrollOffsetDemo for live helper catalog previews. */
export function ScrollOffsetDemo({
  frame,
  frames,
}: Readonly<Props>): ReactNode {
  const stage = useWindowStage();
  const offset = WindowMotion.getScrollOffset({
    frame,
    steps: SCROLL_STEPS,
    stage,
  });
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label={
        "WindowMotion.getScrollOffset({ frame, steps: [{ atFrame: 30, offset: 0.33 }, { atFrame: 60, offset: 0.67 }] })"
      }
      readouts={[
        { name: "offset", value: DemoTheme.formatReadout({ value: offset }) },
      ]}
    >
      <div className={css.scrollOffsetDemoCentered}>
        <div className={css.scrollOffsetDemoScrollWindow}>
          <div
            className={css.scrollOffsetDemoScrollContent}
            style={{
              transform: `translateY(${Motion.mix({
                t: offset,
                from: 0,
                to: -100,
              }).toFixed(3)}%)`,
            }}
          >
            <DemoWindow variant={0} label="1" />
            <DemoWindow variant={1} label="2" />
            <DemoWindow variant={2} label="3" />
          </div>
        </div>
      </div>
    </HelperDemoFrame>
  );
}

type Props = HelperDemoProps;
