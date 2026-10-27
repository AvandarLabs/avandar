import { z } from "zod";
import { createLabelSchema } from "../legacy/createLabelSchema";

/** Strict authored content within the fixed PlexusField layout. */
export const plexusFieldInputSchema = z.strictObject({
  particleCount: z.number().int().min(1).max(64),
  seed: z.number().int().min(0).max(65535),
  heading: createLabelSchema({
    maxLength: 52,
    bounds: { fontSize: 22, width: 832 },
  }),
  showConnections: z.boolean(),
}) satisfies z.ZodType;

/** Schema-inferred content supplied to the renderer. */
export type PlexusFieldInput = z.output<typeof plexusFieldInputSchema>;
