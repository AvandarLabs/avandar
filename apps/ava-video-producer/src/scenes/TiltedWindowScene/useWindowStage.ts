import { useMemo } from "react";
import { useMotionSettingsTheme } from "../../motion-components/motionSettings";
import { useVideoMotion } from "../../videoTheme/useVideoMotion";
import { useVideoProps } from "../../videoTheme/useVideoTheme";
import type { WindowStage } from "./windowMotion";

/**
 * The surrounding theme's window stage: motion, `components.WindowTilt`,
 * `components.WindowMotion`, and the camera settings, for the window
 * helpers in `windowMotion`.
 */
export function useWindowStage(): WindowStage {
  const motion = useVideoMotion();
  const tilt = useVideoProps("WindowTilt", {});
  const window = useVideoProps("WindowMotion", {});
  const settings = useMotionSettingsTheme();
  return useMemo(() => {
    return { motion, tilt, window, settings };
  }, [motion, tilt, window, settings]);
}
