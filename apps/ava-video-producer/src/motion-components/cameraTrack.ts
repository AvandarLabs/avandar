import { z } from "zod";
import { mix } from "../motion";
import {
  getClassicMotionSettingsTheme,
  getMotionDuration,
  getMotionEasing,
  motionEasingSchema,
} from "./motionSettings";
import type { MotionOptions, MotionSettingsTheme } from "./motionSettings";

/** A validated route of camera keys for a canvas of a given size. */
type CameraTrackSchema = z.ZodArray<
  z.ZodObject<
    {
      at: z.ZodNumber;
      x: z.ZodNumber;
      y: z.ZodNumber;
      zoom: z.ZodNumber;
      ease: z.ZodDefault<
        z.ZodUnion<
          readonly [
            typeof motionEasingSchema,
            z.ZodEnum<{ glide: "glide"; push: "push"; whip: "whip" }>,
          ]
        >
      >;
    },
    z.core.$strict
  >
>;

/** Create a validated camera route for a vector canvas of any positive size. */
export function createCameraTrackSchema(
  width = 960,
  height = 600,
): CameraTrackSchema {
  z.number().positive().parse(width);
  z.number().positive().parse(height);
  return z
    .array(
      z
        .object({
          at: z.number().int().nonnegative(),
          x: z.number().min(0).max(width),
          y: z.number().min(0).max(height),
          zoom: z.number().min(1).max(3),
          ease: z
            .union([motionEasingSchema, z.enum(["glide", "push", "whip"])])
            .default("glide"),
        })
        .strict()
        .refine((key) => {
          return (
            key.x >= width / 2 / key.zoom &&
            key.x <= width - width / 2 / key.zoom &&
            key.y >= height / 2 / key.zoom &&
            key.y <= height - height / 2 / key.zoom
          );
        }, "Camera viewport must stay inside the diagram"),
    )
    .min(2)
    .max(16)
    .refine((keys) => {
      return (
        keys[0].at === 0 &&
        keys.every((key, index) => {
          return index === 0 || key.at > keys[index - 1].at;
        })
      );
    }, "Camera keys must start at zero and increase");
}
/** Default camera contract for the 960 by 600 Motion Atlas canvas. */
export const cameraTrackSchema = createCameraTrackSchema();
/** An authored stop. A duplicate pose creates a reading hold. */
export type CameraKeyframe = z.input<typeof cameraTrackSchema>[number];
/** Camera center and magnification, independent of render order. */
export type CameraPose = Pick<CameraKeyframe, "x" | "y" | "zoom">;

/**
 * Stretch only travel intervals; preserve every authored reading hold exactly.
 */
export function retimeCameraTrack(
  keys: readonly CameraKeyframe[],
  options?: MotionOptions,
  theme: MotionSettingsTheme = getClassicMotionSettingsTheme(),
): CameraKeyframe[] {
  let at = 0;
  return keys.map((key, index) => {
    if (index === 0) return { ...key };
    const previous = keys[index - 1];
    const duration = key.at - previous.at;
    const isHold =
      key.x === previous.x &&
      key.y === previous.y &&
      key.zoom === previous.zoom;
    at += isHold ? duration : getMotionDuration(duration, options, theme);
    return { ...key, at };
  });
}

/** A key's named camera ease is the theme's `camera.easing` of that name. */
function getKeyEasing(
  key: CameraKeyframe,
  options: MotionOptions | undefined,
  theme: MotionSettingsTheme,
) {
  const ease = key.ease ?? "glide";
  const named =
    ease === "push" || ease === "whip" || ease === "glide"
      ? theme.motion.curve(theme.camera.easing[ease])
      : undefined;
  const fallback =
    named ??
    getMotionEasing(
      { easing: ease as z.infer<typeof motionEasingSchema> },
      undefined,
      theme,
    );
  return getMotionEasing(options, fallback, theme);
}

/**
 * Sample camera time only; callers continue rendering their content at the real
 * frame. Named eases and omitted settings come from the theme (`classic`
 * unless one is given).
 */
export function getCameraPose(
  keys: readonly CameraKeyframe[] | undefined,
  frame: number,
  enabled = true,
  options?: MotionOptions,
  viewport = { width: 960, height: 600 },
  theme: MotionSettingsTheme = getClassicMotionSettingsTheme(),
): CameraPose {
  if (!enabled || !keys?.length)
    return { x: viewport.width / 2, y: viewport.height / 2, zoom: 1 };
  const route = retimeCameraTrack(keys, options, theme);
  const destinationIndex = route.findIndex((key) => {
    return key.at > frame;
  });
  const destination =
    route[destinationIndex < 0 ? route.length - 1 : destinationIndex];
  const origin =
    route[
      Math.max(
        0,
        destinationIndex < 0 ? route.length - 1 : destinationIndex - 1,
      )
    ];
  const fraction =
    destination.at === origin.at
      ? 1
      : Math.max(
          0,
          Math.min(1, (frame - origin.at) / (destination.at - origin.at)),
        );
  const progress = getKeyEasing(destination, options, theme)(fraction);
  return {
    x: mix(progress, origin.x, destination.x),
    y: mix(progress, origin.y, destination.y),
    zoom: mix(progress, origin.zoom, destination.zoom),
  };
}

/** Blur is active only while the retimed camera changes pose. */
export function isCameraMoving(
  keys: readonly CameraKeyframe[] | undefined,
  frame: number,
  options?: MotionOptions,
  theme: MotionSettingsTheme = getClassicMotionSettingsTheme(),
): boolean {
  const viewport = { width: 960, height: 600 };
  const before = getCameraPose(
    keys,
    frame - 0.3,
    true,
    options,
    viewport,
    theme,
  );
  const after = getCameraPose(
    keys,
    frame + 0.3,
    true,
    options,
    viewport,
    theme,
  );
  return (
    Math.abs(before.x - after.x) +
      Math.abs(before.y - after.y) +
      Math.abs(before.zoom - after.zoom) * 480 >
    0.05
  );
}
