import { storyboardStructureSchema } from "./storyboardStructureSchema";
import { validateStoryboard } from "./validateStoryboard/validateStoryboard";
import type { z } from "zod";
/** A single source for film order, graphics, narration text, and cue timing. */
export const storyboardSchema =
  storyboardStructureSchema.superRefine(validateStoryboard);
/** The validated storyboard document shape. */
export type Storyboard = z.infer<typeof storyboardSchema>;
/** One shot in a validated storyboard document. */
export type Shot = Storyboard["shots"][number];
