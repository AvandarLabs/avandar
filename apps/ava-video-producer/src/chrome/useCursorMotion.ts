import { useMemo } from "react";
import { createCursorMotion, type CursorMotion } from "../cursor-motion";
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
    return createCursorMotion(motion, cursor);
  }, [motion, cursor]);
}
