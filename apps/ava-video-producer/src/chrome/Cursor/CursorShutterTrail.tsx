import { MacOSCursor } from "@remotion/mac-cursors";
import {
  type CursorKey,
  type CursorKind,
  CursorMotionHelpers,
} from "../../CursorMotionHelpers";
import { useCursorMotion } from "../useCursorMotion";
import type { ReactNode } from "react";

type Props = {
  frame: number;
  path: readonly CursorKey[];
  cursor: CursorKind;
  scale: number;
};
/** The motion-blur copies of the cursor along its recent path. */
export function CursorShutterTrail({
  frame,
  path,
  cursor,
  scale,
}: Readonly<Props>): ReactNode {
  const motion = useCursorMotion();
  return CursorMotionHelpers.cursorShutter({ frame, path, motion }).map(
    (sample, index) => {
      return sample.opacity > 0 ? (
        <MacOSCursor
          key={index}
          cursor={cursor}
          showInTimeline={false}
          style={{
            left: sample.x / scale,
            top: sample.y / scale,
            opacity: sample.opacity,
          }}
        />
      ) : null;
    },
  );
}
