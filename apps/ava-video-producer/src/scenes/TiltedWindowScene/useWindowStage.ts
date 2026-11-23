import { MotionSettings } from "../../motion-components/MotionSettings/MotionSettings";
import { useVideoMotion } from "../../videoTheme/useVideoMotion";
import { useVideoProps } from "../../videoTheme/videoThemeHelpers";
import { type WindowStage } from "./WindowMotion/WindowMotion.types";
/**
 * The surrounding theme's window stage: motion, `components.WindowTilt`,
 * `components.WindowMotion`, and the camera settings, for the window
 * helpers in `windowMotion`.
 */
export function useWindowStage(): WindowStage {
  const motion = useVideoMotion();
  const tilt = useVideoProps({
    name: "WindowTilt",
    props: {},
  });
  const window = useVideoProps({
    name: "WindowMotion",
    props: {},
  });
  const settings = MotionSettings.useMotionSettingsTheme();
  return { motion, tilt, window, settings };
}
