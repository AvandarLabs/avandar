import { MacOSCursor } from "@remotion/mac-cursors";
import { CursorMotionHelpers } from "../../../CursorMotionHelpers";
import { VideoCssValues } from "../../../videoTheme/VideoCssValues/VideoCssValues";
import { useVideoProps } from "../../../videoTheme/videoThemeHelpers";
import { useCursorMotion } from "../../useCursorMotion";
import { CursorShutterTrail } from "../CursorShutterTrail";
import css from "./CursorContent.module.css";
import type { Props } from "../CursorShared.types";
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
  const theme = useVideoProps({
    name: "Cursor",
    props: {},
  });
  const motion = useCursorMotion();
  const position = CursorMotionHelpers.trackPos({ frame, keys: path, motion });
  const scale =
    theme.scale * CursorMotionHelpers.cursorScale({ frame, clicks, motion });
  return (
    <div
      aria-hidden="true"
      data-video-cursor={cursor}
      className={css.cursorContentdiv1}
      style={{
        left: position.x,
        top: position.y,
        transform: `scale(${scale})`,
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
        className={css.cursorContentMacOSCursor2}
        style={{
          filter: VideoCssValues.makeDropShadowFilterFromElevation(
            theme.shadow,
          ),
        }}
      />
    </div>
  );
}
