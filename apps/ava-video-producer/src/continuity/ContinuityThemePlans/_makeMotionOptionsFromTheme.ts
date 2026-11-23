import { MotionSettings } from "../../motion-components/MotionSettings/MotionSettings";
import { getMotionEasingFromTheme } from "./getMotionEasingFromTheme";
import type { MotionOptions } from "../../motion-components/MotionSettings/MotionSettings";
import type { ThemeSemantic } from "./ContinuityThemePlans.types";

function _presetMotionOptions({
  preset,
  semantic,
}: Readonly<{
  preset: NonNullable<MotionOptions["preset"]>;
  semantic: ThemeSemantic;
}>): MotionOptions {
  const camera = semantic.camera.presets[preset];
  return {
    speed: camera.speed,
    shutterAngle: camera.shutter,
    easing: getMotionEasingFromTheme({
      easing: camera.easing,
      tokenPath: `camera.presets.${preset}.easing`,
    }),
  };
}
/**
 * Motion options with the theme filled in. A named preset becomes the
 * theme's speed, shutter, and curve for that preset, and every cue gets the
 * theme's blur samples and limits. Values the storyboard authored win.
 * Without a preset, the cue takes the default preset's themed speed, so a
 * timeline read without the theme still counts the frames it renders, and
 * keeps its own fallback curve.
 */
export function _makeMotionOptionsFromTheme({
  options,
  semantic,
}: Readonly<{
  options: MotionOptions | undefined;
  semantic: ThemeSemantic;
}>): MotionOptions {
  const { preset, ...authored }: MotionOptions = options ?? {};
  const blur = semantic.motionBlur;
  return {
    ...(preset
      ? _presetMotionOptions({
          preset,
          semantic,
        })
      : {
          speed:
            semantic.camera.presets[MotionSettings.DEFAULT_MOTION_PRESET].speed,
          shutterAngle: blur.shutter,
        }),
    samples: blur.samples,
    velocityBlurFactor: blur.velocityFactor,
    velocityBlurLimit: blur.velocityMax,
    transitionBlur: blur.transitionBlur,
    ...authored,
  };
}
