import { useMemo } from "react";
import { type CursorMotion, CursorMotionHelpers } from "../CursorMotionHelpers";
import { useVideoMotion } from "../videoTheme/useVideoMotion";
import { useVideoProps } from "../videoTheme/useVideoTheme";
/**
 * The surrounding theme's pointer motion: travel curve, press dip, and
 * trail. Pass it to a pointer helper that runs beside a drawn `Cursor`, for
 * example `cursorOnTarget`, so the cursor shape changes on the travel the
 * pointer draws.
 */
export function useCursorMotion(): CursorMotion {
  const motion = useVideoMotion();
  const cursor = useVideoProps("Cursor", {});
  return useMemo(() => {
    return CursorMotionHelpers.makeCursorMotionFromVideoMotionAndCursor({
      motion,
      cursor,
    });
  }, [motion, cursor]);
}
