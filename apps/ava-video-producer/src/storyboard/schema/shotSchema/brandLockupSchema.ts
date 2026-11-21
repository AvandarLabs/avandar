import { z } from "zod";
import { assetPathSchema, frame, positiveFrames, text } from "../primitives";
import { THEME_TOKEN_NAMES } from "../themeSchema";

/** Brand artwork, build timing and call-to-action fields used by shotSchema. */
export const brandLockupSchema = z.strictObject({
  logo: z.strictObject({
    src: assetPathSchema,
    aspectRatio: z.number().min(0.2).max(5).optional(),
    height: z.number().min(40).max(600).optional(),
  }),
  wordmark: text.max(40).optional(),
  build: z
    .strictObject({
      atFrame: frame.optional(),
      columns: z.number().int().min(2).max(16).optional(),
      staggerFrames: z.number().min(0).max(6).optional(),
      durationInFrames: positiveFrames.max(30).optional(),
    })
    .optional(),
  wordmarkAtFrame: frame.optional(),
  cta: z
    .strictObject({
      atFrame: frame,
      subtitle: text.max(80).optional(),
      url: text.max(48).optional(),
      command: text.max(64).optional(),
      badge: text.max(40).optional(),
      commandCharsPerSecond: z.number().min(10).max(60).optional(),
    })
    .optional(),
  exit: z
    .strictObject({
      kind: z.literal("fly-through"),
      atFrame: frame,
      durationInFrames: positiveFrames.max(45).optional(),
      color: z.enum(THEME_TOKEN_NAMES).optional(),
    })
    .optional(),
});
