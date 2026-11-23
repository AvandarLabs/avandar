import { Cursor } from "../../chrome/chrome";
import { useCursorMotion } from "../../chrome/useCursorMotion";
import { CursorMotionHelpers } from "../../CursorMotionHelpers";
import {
  POINTER,
  CLICKS,
  FIELD_CLICK,
  RUN_CLICK,
  CHIP_CLICK,
  PUBLISH_CLICK,
} from "./timeline";
import type { ReactNode } from "react";

type Props = { frame: number };
/** Places the shared cursor on the demo's authored interaction targets. */
export function DemoCursor({ frame }: Readonly<Props>): ReactNode {
  const cursorMotion = useCursorMotion();
  return (
    <Cursor
      frame={frame}
      path={POINTER}
      clicks={CLICKS}
      cursor={CursorMotionHelpers.cursorOnTarget({
        frame,
        path: POINTER,
        targets: [
          { frame: FIELD_CLICK, x: 420, y: 194, cursor: "text" },
          { frame: RUN_CLICK, x: 1484, y: 194, cursor: "pointer" },
          { frame: CHIP_CLICK, x: 1285, y: 465, cursor: "pointer" },
          { frame: PUBLISH_CLICK, x: 1305, y: 917, cursor: "pointer" },
        ],
        motion: cursorMotion,
      })}
    />
  );
}
