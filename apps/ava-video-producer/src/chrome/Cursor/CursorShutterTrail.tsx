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
        // prettier-ignore
        // Each key identifies a fixed shutter-sample slot. Position
        // and opacity vary each frame, while the sampling order
        // remains fixed.
        // react-doctor-disable-next-line no-array-index-as-key
        <MacOSCursor key={index}
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
