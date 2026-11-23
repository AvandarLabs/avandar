import { useWindowStage } from "../../../../../scenes/TiltedWindowScene/useWindowStage";
import { WindowMotion } from "../../../../../scenes/TiltedWindowScene/WindowMotion/WindowMotion";
import { PAIR_BOXES } from "../../../../../scenes/TiltedWindowScene/windowTilt";
import { DemoTheme } from "../../DemoTheme";
import { HelperDemoFrame } from "../../HelperDemoFrame/HelperDemoFrame";
import { DEMO_CANVAS } from "../../parts/DemoCanvas/DemoCanvas";
import { getCanvasRect } from "../../parts/getCanvasRect";
import { SideEntranceWindows } from "../SideEntranceWindows/SideEntranceWindows";
import type { HelperDemoProps } from "../../helperDemo.types";
import type { ReactNode } from "react";

const PAIR = PAIR_BOXES.map((box) => {
  return getCanvasRect(box);
});

/** Renders SideEntranceDemo for live helper catalog previews. */
export function SideEntranceDemo({
  frame,
  frames,
}: Readonly<Props>): ReactNode {
  const stage = useWindowStage();
  const poses = PAIR.map((box, side) => {
    return WindowMotion.getSideEntrance({
      frame,
      at: 8 + side * 3,
      side: side === 0 ? 0 : 1,
      canvas: DEMO_CANVAS,
      box,
      durationInFrames: undefined,
      stage,
    });
  });
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label={"WindowMotion.getSideEntrance({ frame, at, side, canvas, box })"}
      readouts={poses.map((pose, side) => {
        return {
          name: `side ${side}`,
          value: DemoTheme.formatReadout({ value: pose.translateX, digits: 1 }),
        };
      })}
    >
      <SideEntranceWindows {...{ poses, stage }} />
    </HelperDemoFrame>
  );
}

type Props = HelperDemoProps;
