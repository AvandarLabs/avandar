import { z } from "zod";
import type { Storyboard } from "../storyboard/schema/schema";

/**
 * Render options a viewer toggles for a continuity composition, shared by
 * previews and exports. Colours, sketch levels, and camera presets are
 * design tokens edited in the theme, not options.
 */
export const continuityAppearanceSchema = z
  .object({
    captions: z.boolean().default(true),
    cameraMotion: z.boolean().default(true),
    motionBlur: z.boolean().default(true),
    annotations: z.boolean().default(true),
  })
  .strict();

/** Complete render options acknowledged by the active player. */
export type ContinuityAppearance = z.infer<typeof continuityAppearanceSchema>;

/**
 * Applies render options to every continuity shot without mutating the
 * authored plan. Captions are a film option and stay out of shot props.
 */
export function createContinuityPlanFromOptions(
  plan: Storyboard,
  raw: unknown,
): Storyboard {
  const shape = continuityAppearanceSchema.shape;
  const { captions: _captions, ...appearance } = z
    .object({
      captions: shape.captions.unwrap().optional(),
      cameraMotion: shape.cameraMotion.unwrap().optional(),
      motionBlur: shape.motionBlur.unwrap().optional(),
      annotations: shape.annotations.unwrap().optional(),
    })
    .strict()
    .parse(raw);
  return {
    ...plan,
    shots: plan.shots.map((shot) =>
      shot.scene === "continuity"
        ? { ...shot, props: { ...shot.props, ...appearance } }
        : shot,
    ),
  };
}
