import { MacOSCursor } from "@remotion/mac-cursors";
import {
  cursorScale,
  cursorShutter,
  trackPos,
  type CursorKey,
  type CursorKind,
} from "../cursor-motion";

/** Native assets keep their own hotspot correction; the parent scales around
 * the measured target, so clicking never moves the arrow tip or I-beam center. */
export function Cursor({
  frame,
  path,
  clicks = [],
  cursor = "default",
}: {
  frame: number;
  path: readonly CursorKey[];
  clicks?: readonly number[];
  cursor?: CursorKind;
}) {
  const position = trackPos(frame, path);
  const scale = 1.4 * cursorScale(frame, clicks);
  return (
    <div
      aria-hidden="true"
      data-video-cursor={cursor}
      style={{
        position: "absolute",
        left: position.x,
        top: position.y,
        transform: `scale(${scale})`,
        transformOrigin: "0 0",
        zIndex: 50,
        pointerEvents: "none",
      }}
    >
      {cursorShutter(frame, path).map((sample, index) =>
        sample.opacity > 0 ? (
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
        ) : null,
      )}
      <MacOSCursor
        cursor={cursor}
        showInTimeline={false}
        style={{
          left: 0,
          top: 0,
          filter: "drop-shadow(0 1px 1px rgb(0 0 0 / 0.16))",
        }}
      />
    </div>
  );
}
