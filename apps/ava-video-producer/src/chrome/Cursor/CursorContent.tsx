import { MacOSCursor } from "@remotion/mac-cursors";
import { CursorMotionHelpers } from "../../CursorMotionHelpers";
import { elevationToDropShadowFilter } from "../../videoTheme/cssValueHelpers/cssValueHelpers";
import { useVideoProps } from "../../videoTheme/useVideoTheme";
import { useCursorMotion } from "../useCursorMotion";
import { type Props } from "./CursorShared.types";
import { CursorShutterTrail } from "./CursorShutterTrail";
import type { ReactNode } from "react";
/**
 * Positions the native pointer with click scaling and a motion trail for
 * `Cursor`.
 */
export function CursorContent({
  frame,
  path,
  clicks = [],
  cursor = "default",
}: Props): ReactNode {
  const theme = useVideoProps("Cursor", {});
  const motion = useCursorMotion();
  const position = CursorMotionHelpers.trackPos({ frame, keys: path, motion });
  const scale =
    theme.scale * CursorMotionHelpers.cursorScale({ frame, clicks, motion });
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
      <CursorShutterTrail
        frame={frame}
        path={path}
        cursor={cursor}
        scale={scale}
      />
      <MacOSCursor
        cursor={cursor}
        showInTimeline={false}
        style={{
          left: 0,
          top: 0,
          filter: elevationToDropShadowFilter(theme.shadow),
        }}
      />
    </div>
  );
}
