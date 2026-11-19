import { MacOSCursor } from "@remotion/mac-cursors";
import { useMemo } from "react";
import {
  createCursorMotion,
  cursorScale,
  cursorShutter,
  trackPos,
  type CursorKey,
  type CursorKind,
} from "../cursor-motion";
import { StageThemeBoundary } from "../scenes/stageTheme/StageThemeBoundary";
import { elevationToDropShadowFilter } from "../videoTheme/cssValueHelpers/cssValueHelpers";
import { useVideoMotion } from "../videoTheme/useVideoMotion";
import { useVideoProps } from "../videoTheme/useVideoTheme";
import type { ReactNode } from "react";

type Props = {
  frame: number;
  path: readonly CursorKey[];
  clicks?: readonly number[];
  cursor?: CursorKind;
};

/** Native assets keep their own hotspot correction; the parent scales around
 * the measured target, so clicking never moves the arrow tip or I-beam
 * center. Size, press, trail, and shadow come from `components.Cursor`. */
export function Cursor(props: Props): ReactNode {
  return (
    <StageThemeBoundary>
      <CursorContent {...props} />
    </StageThemeBoundary>
  );
}

function CursorContent({
  frame,
  path,
  clicks = [],
  cursor = "default",
}: Props): ReactNode {
  const theme = useVideoProps("Cursor", {});
  const videoMotion = useVideoMotion();
  const motion = useMemo(() => {
    return createCursorMotion(videoMotion, theme);
  }, [videoMotion, theme]);
  const position = trackPos(frame, path, motion);
  const scale = theme.scale * cursorScale(frame, clicks, motion);
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
      {cursorShutter(frame, path, motion).map((sample, index) => {
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
      })}
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
