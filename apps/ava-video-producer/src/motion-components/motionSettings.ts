import { z } from "zod";
import { bezier, EASE, ramp } from "../motion";

const controlPoint = z.number().min(0).max(1);
/** Bounded curves keep camera viewports inside their authored endpoints. */
export const motionEasingSchema = z.union([
  z.enum(["linear", "ease-in", "ease-out", "ease-in-out", "ease-in-out-cubic"]),
  z.tuple([controlPoint, controlPoint, controlPoint, controlPoint]),
]);
/** Named easing or CSS-style [x1, y1, x2, y2] cubic Bezier control points. */
export type MotionEasing = z.infer<typeof motionEasingSchema>;

/** Editorial motion vocabulary. Speed multiplies travel rate, never reading holds. */
export const MOTION_PRESETS = {
  deliberate: { speed: 0.25, shutterAngle: 45, easing: "ease-in-out" },
  gentle: { speed: 0.5, shutterAngle: 90, easing: "ease-in-out" },
  balanced: { speed: 0.75, shutterAngle: 120, easing: "ease-in-out" },
  brisk: { speed: 1, shutterAngle: 180, easing: "ease-in-out-cubic" },
  whip: { speed: 1.5, shutterAngle: 240, easing: "ease-in-out-cubic" },
} as const;

/** Serializable overrides shared by JSX components and storyboard motion cues. */
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
  })
  .strict();
/** Numeric overrides take precedence over the selected semantic preset. */
export type MotionOptions = z.infer<typeof motionOptionsSchema>;

/** Resolve safe motion settings without modifying the caller's options. */
export function resolveMotionSettings(options: MotionOptions = {}) {
  const parsed = motionOptionsSchema.parse(options);
  const preset = MOTION_PRESETS[parsed.preset ?? "brisk"];
  return {
    speed: parsed.speed ?? preset.speed,
    easing: parsed.easing ?? preset.easing,
    shutterAngle: parsed.shutterAngle ?? preset.shutterAngle,
    samples: parsed.samples ?? 10,
    blurStrength: parsed.blurStrength ?? 1,
  };
}

/** Convert authored travel frames to actual frames. A zero-length cut stays zero. */
export function getMotionDuration(
  frames: number,
  options?: MotionOptions,
): number {
  z.number().int().nonnegative().parse(frames);
  const { speed } = resolveMotionSettings(options);
  return frames === 0 ? 0 : Math.max(1, Math.round(frames / speed));
}

/** Existing cues retain their curve unless a preset or explicit easing replaces it. */
export function getMotionEasing(
  options?: MotionOptions,
  fallback = EASE.inOut,
) {
  if (!options?.easing && !options?.preset) return fallback;
  const { easing } = resolveMotionSettings(options);
  if (Array.isArray(easing)) return bezier(...easing);
  switch (easing) {
    case "linear":
      return (progress: number) => progress;
    case "ease-in":
      return bezier(0.42, 0, 1, 1);
    case "ease-out":
      return bezier(0, 0, 0.58, 1);
    case "ease-in-out-cubic":
      return EASE.inOutCubic;
    case "ease-in-out":
      return EASE.inOut;
  }
}

/** Clamp movement at its endpoints, including fractional shutter-sample frames. */
export function getMotionProgress(
  frame: number,
  at: number,
  duration: number,
  options?: MotionOptions,
  fallback = EASE.inOut,
) {
  return ramp(
    frame,
    at,
    getMotionDuration(duration, options),
    getMotionEasing(options, fallback),
  );
}

/** Bounded screen-space blur for single-instance overlays and scene movement. */
export function getVelocityBlur(
  distancePerFrame: number,
  options?: MotionOptions,
  maximum = 3,
): number {
  const settings = resolveMotionSettings(options);
  return (
    (Math.min(maximum, Math.abs(distancePerFrame) * 0.09) *
      settings.blurStrength *
      settings.shutterAngle) /
    180
  );
}
