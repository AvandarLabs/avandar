import { z } from "zod";
import {
  assetPathSchema,
  frame,
  id,
  positiveFrames,
  text,
} from "../primitives";
import { shotSchema } from "../shotSchema";
import { themeSchema } from "../themeSchema";

const cueSchema = z.strictObject({
  id,
  shotId: id,
  beatId: id.optional(),
  startFrame: frame,
  endFrame: positiveFrames,
  text: text.max(180),
  audio: assetPathSchema.optional(),
});
/** A single source for film order, graphics, narration text, and cue timing. */
export const storyboardStructureSchema = z.strictObject({
  version: z.literal(1),
  id,
  title: text.max(120),
  description: text.max(1000),
  sourceNotes: z.array(text).min(1),
  purpose: z.enum(["standalone", "loop"]),
  fps: z.literal(30),
  width: z.number().int().min(960).max(3840),
  height: z.number().int().min(640).max(2160),
  delivery: z.strictObject({
    width: z.number().int().min(320).max(3840),
    height: z.number().int().min(240).max(2160),
  }),
  theme: themeSchema.optional(),
  shots: z.array(shotSchema).min(1).max(100),
  narration: z.array(cueSchema).default([]),
  captions: z.boolean().default(true),
  narrationTrack: z
    .strictObject({
      src: assetPathSchema,
      startFrame: frame.default(0),
      volume: z.number().min(0).max(2).default(1),
    })
    .optional(),
  soundEffects: z
    .array(
      z.strictObject({
        id,
        src: assetPathSchema,
        atFrame: frame,
        volume: z.number().min(0).max(1).default(0.25),
      }),
    )
    .default([]),
});
