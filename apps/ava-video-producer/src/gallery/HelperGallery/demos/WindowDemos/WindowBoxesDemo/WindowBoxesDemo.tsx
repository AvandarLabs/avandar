import {
  HEADLINE_BOX,
  PAIR_BOXES,
  WINDOW_BOX,
  WINDOW_BOX_TALL,
} from "../../../../../scenes/TiltedWindowScene/windowTilt";
import { HelperDemoFrame } from "../../HelperDemoFrame/HelperDemoFrame";
import { DemoCanvas } from "../../parts/DemoCanvas/DemoCanvas";
import { BoxOutlines } from "../BoxOutlines/BoxOutlines";
import type { HelperDemoProps } from "../../helperDemo.types";
import type { ReactNode } from "react";

/** Each named box, cycled one at a time. */
const NAMED_BOXES = [
  { name: "WINDOW_BOX", boxes: [WINDOW_BOX] },
  { name: "WINDOW_BOX_TALL", boxes: [WINDOW_BOX_TALL] },
  { name: "PAIR_BOXES", boxes: PAIR_BOXES },
  { name: "HEADLINE_BOX", boxes: [HEADLINE_BOX] },
] as const;

/** Renders WindowBoxesDemo for live helper catalog previews. */
export function WindowBoxesDemo({ frame, frames }: Readonly<Props>): ReactNode {
  const activeIndex = Math.floor(frame / 30) % NAMED_BOXES.length;
  const active = NAMED_BOXES[activeIndex];
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label={active.name}
      readouts={[
        { name: "x", value: String(active.boxes[0].x) },
        { name: "y", value: String(active.boxes[0].y) },
        { name: "width", value: String(active.boxes[0].width) },
        {
          name: "height",
          value:
            "height" in active.boxes[0]
              ? String(active.boxes[0].height)
              : "fits its lines",
        },
      ]}
    >
      <DemoCanvas>
        <BoxOutlines activeIndex={activeIndex} />
      </DemoCanvas>
    </HelperDemoFrame>
  );
}

type Props = HelperDemoProps;
