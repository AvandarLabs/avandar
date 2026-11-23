import { MotionSettings } from "../../motion-components/MotionSettings/MotionSettings";
import { ContinuityThemePlans } from "./ContinuityThemePlans";
import { getMotionEasingFromTheme } from "./getMotionEasingFromTheme";
import type {
  ThemeSemantic,
  CameraTheme,
  CameraCurveName,
  CameraKey,
} from "./ContinuityThemePlans.types";

const CAMERA_CURVE_NAMES = ["glide", "push", "whip"] as const;
/** The stock diagram a continuity camera frames. */
const STOCK_CANVAS = { width: 960, height: 600 };
/** Reads every camera token once, so a plan's shots share one conversion. */
export function createCameraThemeFromSemantic(
  semantic: ThemeSemantic,
): CameraTheme {
  const { easing, zoom, preset } = semantic.camera;
  const presetName = MotionSettings.motionOptionsSchema.shape.preset
    .unwrap()
    .safeParse(preset);
  return {
    curves: {
      glide: getMotionEasingFromTheme({
        easing: easing.glide,
        tokenPath: "camera.easing.glide",
      }),
      push: getMotionEasingFromTheme({
        easing: easing.push,
        tokenPath: "camera.easing.push",
      }),
      whip: getMotionEasingFromTheme({
        easing: easing.whip,
        tokenPath: "camera.easing.whip",
      }),
    },
    zoom,
    presetOptions: presetName.success
      ? ContinuityThemePlans.makeMotionOptionsFromTheme({
          options: { preset: presetName.data },
          semantic,
        })
      : undefined,
  };
}
function _isCameraCurveName(ease: string): ease is CameraCurveName {
  return (CAMERA_CURVE_NAMES as readonly string[]).includes(ease);
}
/**
 * A camera key with the theme's curve for its named ease and its zoom inside
 * the theme's limits. A clamped key moves its centre just enough to keep the
 * wider or tighter view inside the diagram.
 */
export function createCameraKeyFromTheme({
  key,
  camera,
}: Readonly<{
  key: CameraKey;
  camera: CameraTheme;
}>): CameraKey {
  const ease = key.ease;
  const curve =
    typeof ease === "string" && _isCameraCurveName(ease)
      ? camera.curves[ease]
      : ease;
  const zoom = Math.min(camera.zoom.max, Math.max(camera.zoom.min, key.zoom));
  if (zoom === key.zoom) {
    return { ...key, ease: curve };
  }
  const halfWidth = STOCK_CANVAS.width / 2 / zoom;
  const halfHeight = STOCK_CANVAS.height / 2 / zoom;
  return {
    ...key,
    ease: curve,
    zoom,
    x: Math.min(STOCK_CANVAS.width - halfWidth, Math.max(halfWidth, key.x)),
    y: Math.min(STOCK_CANVAS.height - halfHeight, Math.max(halfHeight, key.y)),
  };
}
