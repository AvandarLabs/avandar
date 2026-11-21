import { Cursor } from "../../../../../chrome/Cursor/Cursor";
import { useCursorMotion } from "../../../../../chrome/useCursorMotion";
import { CursorMotionHelpers } from "../../../../../CursorMotionHelpers";
import { HelperDemoFrame } from "../../HelperDemoFrame/HelperDemoFrame";
import { Targets } from "../Targets/Targets";
import type {
  CursorKey,
  CursorTarget,
} from "../../../../../CursorMotionHelpers";
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

const TARGETS: CursorTarget[] = [
  { frame: CLICKS[0], ...FIELD, cursor: "text" },
  { frame: CLICKS[1], ...BUTTON, cursor: "pointer" },
];

/** Renders CursorOnTargetDemo for live helper catalog previews. */
export function CursorOnTargetDemo({
  frame,
  frames,
}: Readonly<Props>): ReactNode {
  const shape = CursorMotionHelpers.cursorOnTarget({
    frame,
    path: PATH,
    targets: TARGETS,
    motion: useCursorMotion(),
  });
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label={"CursorMotionHelpers.cursorOnTarget({ frame, path, targets })"}
      readouts={[{ name: "cursor", value: shape }]}
    >
      <Targets frame={frame} />
      <Cursor frame={frame} path={PATH} clicks={CLICKS} cursor={shape} />
    </HelperDemoFrame>
  );
}

type Props = HelperDemoProps;
