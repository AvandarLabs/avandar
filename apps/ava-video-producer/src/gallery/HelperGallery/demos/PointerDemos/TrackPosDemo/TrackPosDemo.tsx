import { Cursor } from "../../../../../chrome/Cursor/Cursor";
import { useCursorMotion } from "../../../../../chrome/useCursorMotion";
import { CursorMotionHelpers } from "../../../../../CursorMotionHelpers";
import { DemoTheme } from "../../DemoTheme";
import { HelperDemoFrame } from "../../HelperDemoFrame/HelperDemoFrame";
import { Targets } from "../Targets/Targets";
import type { CursorKey } from "../../../../../CursorMotionHelpers";
import type { HelperDemoProps } from "../../helperDemo.types";
import type { ReactNode } from "react";

/** Field and button centres on the preview stage. */
const FIELD = { x: 230, y: 120 };

const BUTTON = { x: 640, y: 320 };

const CLICKS = [32, 84];

/** Arrive, hold through each click plus 8 frames, then move on. */
const PATH: CursorKey[] = [
  { at: 0, x: 80, y: 400 },
  { at: 22, x: FIELD.x, y: FIELD.y },
  { at: CLICKS[0] + 18, x: FIELD.x, y: FIELD.y },
  { at: 74, x: BUTTON.x, y: BUTTON.y },
  { at: CLICKS[1] + 20, x: BUTTON.x, y: BUTTON.y },
];

/** Renders TrackPosDemo for live helper catalog previews. */
export function TrackPosDemo({ frame, frames }: Readonly<Props>): ReactNode {
  const position = CursorMotionHelpers.trackPos({
    frame,
    keys: PATH,
    motion: useCursorMotion(),
  });
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label={
        "CursorMotionHelpers.trackPos({ frame, keys })  <Cursor frame path clicks />"
      }
      readouts={[
        {
          name: "x",
          value: DemoTheme.formatReadout({ value: position.x, digits: 1 }),
        },
        {
          name: "y",
          value: DemoTheme.formatReadout({ value: position.y, digits: 1 }),
        },
        { name: "clicks", value: CLICKS.join(", ") },
      ]}
    >
      <Targets frame={frame} />
      <Cursor frame={frame} path={PATH} clicks={CLICKS} />
    </HelperDemoFrame>
  );
}

type Props = HelperDemoProps;
