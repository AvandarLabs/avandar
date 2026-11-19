import { useMemo } from "react";
import { z } from "zod";
import { bezier, ramp } from "../motion";
import {
  getClassicStageMotion,
  getClassicStageTheme,
} from "../scenes/stageTheme/stageTheme";
import { createVideoMotion } from "../videoTheme/createVideoMotion/createVideoMotion";
import { useVideoThemeContext } from "../videoTheme/useVideoTheme";
import type { VideoMotion } from "../videoTheme/createVideoMotion/createVideoMotion";
import type {
  ResolvedVideoAtomic,
  ResolvedVideoSemantic,
  ResolvedVideoTheme,
} from "../videoTheme/videoTheme.types";

const controlPoint = z.number().min(0).max(1);
/** Bounded curves keep camera viewports inside their authored endpoints. */
export const motionEasingSchema = z.union([
  z.enum(["linear", "ease-in", "ease-out", "ease-in-out", "ease-in-out-cubic"]),
  z.tuple([controlPoint, controlPoint, controlPoint, controlPoint]),
]);
/** Named easing or CSS-style [x1, y1, x2, y2] cubic Bezier control points. */
export type MotionEasing = z.infer<typeof motionEasingSchema>;

/**
 * Editorial motion vocabulary: the named camera presets and the curve each
 * one names. Speed multiplies travel rate, never reading holds. Settings
 * read each preset's speed and shutter from the theme's `camera.presets`,
 * whose `classic` values these equal.
 */
export const MOTION_PRESETS = {
  deliberate: { speed: 0.25, shutterAngle: 45, easing: "ease-in-out" },
  gentle: { speed: 0.5, shutterAngle: 90, easing: "ease-in-out" },
  balanced: { speed: 0.75, shutterAngle: 120, easing: "ease-in-out" },
  brisk: { speed: 1, shutterAngle: 180, easing: "ease-in-out-cubic" },
  whip: { speed: 1.5, shutterAngle: 240, easing: "ease-in-out-cubic" },
} as const;

/**
 * Serializable overrides shared by JSX components and storyboard motion
 * cues. In a continuity shot, `createContinuityPlanFromVideoTheme` expands a
 * preset and fills the shutter, samples, and blur fields from the video
 * theme; a value the storyboard authors overrides the theme for that cue.
 */
export const motionOptionsSchema = z
  .object({
    preset: z
      .enum(["deliberate", "gentle", "balanced", "brisk", "whip"])
      .optional(),
    speed: z.number().min(0.1).max(4).optional(),
    easing: motionEasingSchema.optional(),
    shutterAngle: z.number().min(0).max(360).optional(),
    samples: z.number().int().min(2).max(16).optional(),
    blurStrength: z.number().min(0).max(2).optional(),
    velocityBlurFactor: z.number().min(0).max(1).optional(),
    velocityBlurLimit: z.number().min(0).max(20).optional(),
    transitionBlur: z.number().min(0).max(48).optional(),
  })
  .strict();
/** Numeric overrides take precedence over the selected semantic preset. */
export type MotionOptions = z.infer<typeof motionOptionsSchema>;

/** Every motion override resolved against its preset and defaults. */
type ResolvedMotionSettings = {
  speed: number;
  easing: MotionEasing;
  shutterAngle: number;
  samples: number;
  blurStrength: number;
  velocityBlurFactor: number;
  velocityBlurLimit: number;
  transitionBlur: number;
};

/**
 * The theme values motion cues fall back to: camera presets, motion blur,
 * the atomic curves the named easings stand for, and the travel curve of
 * an unnamed cue.
 */
export type MotionSettingsTheme = Readonly<{
  camera: ResolvedVideoSemantic["camera"];
  motionBlur: ResolvedVideoSemantic["motionBlur"];
  easing: ResolvedVideoAtomic["easing"];
  motion: VideoMotion;
}>;

/** The motion settings theme of a resolved video theme. */
export function createMotionSettingsTheme(
  theme: ResolvedVideoTheme,
  motion: VideoMotion = createVideoMotion(theme.semantic.motion),
): MotionSettingsTheme {
  return {
    camera: theme.semantic.camera,
    motionBlur: theme.semantic.motionBlur,
    easing: theme.atomic.easing,
    motion,
  };
}

let classicSettingsTheme: MotionSettingsTheme | undefined;

/** `classic`'s motion settings theme, the default of every settings helper. */
export function getClassicMotionSettingsTheme(): MotionSettingsTheme {
  classicSettingsTheme ??= createMotionSettingsTheme(
    getClassicStageTheme(),
    getClassicStageMotion(),
  );
  return classicSettingsTheme;
}

/**
 * The motion settings theme of the surrounding video theme, or `classic`
 * outside any provider, for motion components that also render in helper
 * previews.
 */
export function useMotionSettingsTheme(): MotionSettingsTheme {
  const theme = useVideoThemeContext()?.theme;
  return useMemo(() => {
    return theme
      ? createMotionSettingsTheme(theme)
      : getClassicMotionSettingsTheme();
  }, [theme]);
}

/**
 * Resolve safe motion settings without modifying the caller's options. What
 * the options leave out comes from the theme: the preset's speed and shutter
 * from `camera.presets`, the rest from `motionBlur`.
 */
export function resolveMotionSettings(
  options: MotionOptions = {},
  theme: MotionSettingsTheme = getClassicMotionSettingsTheme(),
): ResolvedMotionSettings {
  const parsed = motionOptionsSchema.parse(options);
  const presetName = parsed.preset ?? "brisk";
  const preset = theme.camera.presets[presetName];
  const { motionBlur } = theme;
  return {
    speed: parsed.speed ?? preset.speed,
    easing: parsed.easing ?? MOTION_PRESETS[presetName].easing,
    shutterAngle: parsed.shutterAngle ?? preset.shutter,
    samples: parsed.samples ?? motionBlur.samples,
    blurStrength: parsed.blurStrength ?? motionBlur.strength,
    velocityBlurFactor: parsed.velocityBlurFactor ?? motionBlur.velocityFactor,
    velocityBlurLimit: parsed.velocityBlurLimit ?? motionBlur.velocityMax,
    transitionBlur: parsed.transitionBlur ?? motionBlur.transitionBlur,
  };
}

/**
 * Convert authored travel frames to actual frames. A zero-length cut stays
 * zero.
 */
export function getMotionDuration(
  frames: number,
  options?: MotionOptions,
  theme: MotionSettingsTheme = getClassicMotionSettingsTheme(),
): number {
  z.number().int().nonnegative().parse(frames);
  const { speed } = resolveMotionSettings(options, theme);
  return frames === 0 ? 0 : Math.max(1, Math.round(frames / speed));
}

/**
 * Existing cues retain their curve (the theme's travel curve unless the
 * caller names one) unless a preset or explicit easing replaces it. A named
 * easing is the theme's atomic curve of that name.
 */
export function getMotionEasing(
  options?: MotionOptions,
  fallback?: (t: number) => number,
  theme: MotionSettingsTheme = getClassicMotionSettingsTheme(),
): (t: number) => number {
  if (!options?.easing && !options?.preset) {
    return fallback ?? theme.motion.travel.easing;
  }
  const { easing } = resolveMotionSettings(options, theme);
  if (Array.isArray(easing)) return bezier(...easing);
  const curve = theme.motion.curve;
  switch (easing) {
    case "linear":
      return (progress: number) => {
        return progress;
      };
    case "ease-in":
      return curve(theme.easing.cssEaseIn);
    case "ease-out":
      return curve(theme.easing.cssEaseOut);
    case "ease-in-out-cubic":
      return curve(theme.easing.inOutCubic);
    case "ease-in-out":
      return curve(theme.easing.inOut);
  }
}

/**
 * Clamp movement at its endpoints, including fractional shutter-sample frames.
 */
export function getMotionProgress(
  frame: number,
  at: number,
  duration: number,
  options?: MotionOptions,
  fallback?: (t: number) => number,
  theme: MotionSettingsTheme = getClassicMotionSettingsTheme(),
): number {
  return ramp(
    frame,
    at,
    getMotionDuration(duration, options, theme),
    getMotionEasing(options, fallback, theme),
  );
}

/**
 * Bounded screen-space blur for single-instance overlays and scene movement:
 * the travel per frame times the blur factor, capped at the limit (the
 * motion options' `velocityBlurLimit` unless `maximum` is given).
 */
export function getVelocityBlur(
  distancePerFrame: number,
  options?: MotionOptions,
  maximum?: number,
  theme: MotionSettingsTheme = getClassicMotionSettingsTheme(),
): number {
  const settings = resolveMotionSettings(options, theme);
  return (
    (Math.min(
      maximum ?? settings.velocityBlurLimit,
      Math.abs(distancePerFrame) * settings.velocityBlurFactor,
    ) *
      settings.blurStrength *
      settings.shutterAngle) /
    180
  );
}
