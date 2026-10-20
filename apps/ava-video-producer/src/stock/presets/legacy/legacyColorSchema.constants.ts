import { z } from "zod";

/** Opaque local SVG color with no external paint-server references. */
export const legacyColorSchema: z.ZodString = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/);
