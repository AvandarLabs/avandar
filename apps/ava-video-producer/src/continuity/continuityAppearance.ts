import { z } from "zod";
import { DEFAULT_ACCENT } from "../gallery/palette";
import { motionOptionsSchema } from "../motion-components/motionSettings";
import type { Storyboard } from "../storyboard/schema/schema";

/** Validated editorial controls shared by previews and exports. */
export const continuityAppearanceSchema = z
  .object({
    captions: z.boolean().default(true),
    accent: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/)
      .default(DEFAULT_ACCENT),
    background: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/)
      .default("#0b1219"),
    cameraMotion: z.boolean().default(true),
    cameraPreset: motionOptionsSchema.shape.preset
      .unwrap()
      .or(z.literal("authored"))
      .default("authored"),
    motionBlur: z.boolean().default(true),
    annotations: z.boolean().default(true),
    annotationRoughness: z.number().min(0).max(3).default(1.5),
    boxRoughness: z.number().min(0).max(3).default(0),
  })
  .strict();
/** Complete appearance acknowledged by the active player. */
export type ContinuityAppearance = z.infer<typeof continuityAppearanceSchema>;

/** Apply the render switches without mutating authored inputs. Values the video theme owns are ignored here. */
export function createContinuityPlanFromOptions(
  plan: Storyboard,
  raw: unknown,
): Storyboard {
  const shape = continuityAppearanceSchema.shape;
  const options = z
    .object({
      captions: shape.captions.unwrap().optional(),
      accent: shape.accent.unwrap().optional(),
      background: shape.background.unwrap().optional(),
      cameraMotion: shape.cameraMotion.unwrap().optional(),
      cameraPreset: shape.cameraPreset.unwrap().optional(),
      motionBlur: shape.motionBlur.unwrap().optional(),
      annotations: shape.annotations.unwrap().optional(),
      annotationRoughness: shape.annotationRoughness.unwrap().optional(),
      boxRoughness: shape.boxRoughness.unwrap().optional(),
    })
    .strict()
    .parse(raw);
  // Palette, roughness, and the camera preset reach the renderer through the
  // theme (see createThemePatchFromLegacyAppearance), never through shot props.
  const {
    captions: _captions,
    cameraPreset: _cameraPreset,
    accent: _accent,
    background: _background,
    annotationRoughness: _annotationRoughness,
    boxRoughness: _boxRoughness,
    ...appearance
  } = options;
  return {
    ...plan,
    shots: plan.shots.map((shot) => {
      if (shot.scene !== "continuity") {
        return shot;
      }
      return { ...shot, props: { ...shot.props, ...appearance } };
    }),
  };
}
