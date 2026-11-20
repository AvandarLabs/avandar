import { MotionSettings } from "../../motion-components/MotionSettings/MotionSettings";
import { useVideoMotion } from "../../videoTheme/useVideoMotion";
import { useVideoProps } from "../../videoTheme/useVideoTheme";
import { type WindowStage } from "./WindowMotion/WindowMotion.types";
/**
 * The surrounding theme's window stage: motion, `components.WindowTilt`,
 * `components.WindowMotion`, and the camera settings, for the window
 * helpers in `windowMotion`.
 */
export function useWindowStage(): WindowStage {
  const motion = useVideoMotion();
  const tilt = useVideoProps("WindowTilt", {});
  const window = useVideoProps("WindowMotion", {});
  const settings = MotionSettings.useMotionSettingsTheme();
  return { motion, tilt, window, settings };
}
