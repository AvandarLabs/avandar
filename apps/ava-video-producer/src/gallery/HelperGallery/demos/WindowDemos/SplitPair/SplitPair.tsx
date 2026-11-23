import { Motion } from "../../../../../motion";
import { useWindowStage } from "../../../../../scenes/TiltedWindowScene/useWindowStage";
import { WindowMotion } from "../../../../../scenes/TiltedWindowScene/WindowMotion/WindowMotion";
import { PAIR_BOXES } from "../../../../../scenes/TiltedWindowScene/windowTilt";
import { DEMO_CANVAS } from "../../parts/DemoCanvas/DemoCanvas";
import { getCanvasRect } from "../../parts/getCanvasRect";
import { TiltedDemoWindow } from "../../parts/TiltedDemoWindow/TiltedDemoWindow";
import type { ReactNode } from "react";

const PAIR = PAIR_BOXES.map((box) => {
  return getCanvasRect(box);
});

/** Renders SplitPair for live helper catalog previews. */
export function SplitPair({ split }: Readonly<Props>): ReactNode {
  const stage = useWindowStage();
  const joinedLeft = (DEMO_CANVAS.width - PAIR[0].width - PAIR[1].width) / 2;
  return PAIR.map((box, side) => {
    return (
      <TiltedDemoWindow
        key={box.x}
        box={{
          ...box,
          x: Motion.mix({
            t: split,
            from: joinedLeft + side * PAIR[0].width,
            to: box.x,
          }),
        }}
        pose={{
          ...WindowMotion.getRestingPose(stage),
          rotateY: (side === 0 ? 1 : -1) * stage.tilt.pairRotateY,
        }}
        tilt={split}
        perspective={stage.tilt.pairPerspective}
        rotateX={stage.tilt.pairRotateX}
        rotateZ={0}
        variant={side === 0 ? 0 : 1}
      />
    );
  });
}

type Props = { split: number };
