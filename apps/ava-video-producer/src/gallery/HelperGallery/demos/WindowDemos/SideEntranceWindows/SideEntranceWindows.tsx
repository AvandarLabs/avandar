import { PAIR_BOXES } from "../../../../../scenes/TiltedWindowScene/windowTilt";
import { DemoCanvas } from "../../parts/DemoCanvas/DemoCanvas";
import { getCanvasRect } from "../../parts/getCanvasRect";
import { TiltedDemoWindow } from "../../parts/TiltedDemoWindow/TiltedDemoWindow";
import type { useWindowStage } from "../../../../../scenes/TiltedWindowScene/useWindowStage";
import type { WindowMotion } from "../../../../../scenes/TiltedWindowScene/WindowMotion/WindowMotion";
import type { ReactNode } from "react";

const PAIR = PAIR_BOXES.map((box) => {
  return getCanvasRect(box);
});
type Props = {
  poses: ReadonlyArray<ReturnType<typeof WindowMotion.getSideEntrance>>;
  stage: ReturnType<typeof useWindowStage>;
};
/** Draws both tilted windows at their sampled side-entrance poses. */
export function SideEntranceWindows({
  poses,
  stage,
}: Readonly<Props>): ReactNode {
  return (
    <DemoCanvas>
      {PAIR.map((box, side) => {
        return (
          <TiltedDemoWindow
            key={box.x}
            box={box}
            pose={{
              ...poses[side],
              rotateY: (side === 0 ? 1 : -1) * stage.tilt.pairRotateY,
            }}
            perspective={stage.tilt.pairPerspective}
            rotateX={stage.tilt.pairRotateX}
            rotateZ={0}
            variant={side === 0 ? 0 : 1}
          />
        );
      })}
    </DemoCanvas>
  );
}
