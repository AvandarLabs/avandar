import { z } from "zod";
import { createLabelSchema } from "../legacy/createLabelSchema";
import { legacyColorSchema } from "../legacy/legacyColorSchema.constants";

/** Strict authored content within the fixed OrbitalSystem layout. */
export const orbitalSystemInputSchema = z.strictObject({
  bodies: z
    .array(
      z.strictObject({
        rx: z.number().min(40).max(300),
        ry: z.number().min(40).max(185),
        angle: z.number().min(-40).max(40),
        color: z.union([legacyColorSchema, z.literal("accent")]),
        phase: z.number().min(0).max(179),
        label: createLabelSchema({
          maxLength: 10,
          bounds: { fontSize: 12, width: 100 },
        }),
      }),
    )
    .min(1)
    .max(3),
  showOrbits: z.boolean(),
}) satisfies z.ZodType;

/** Schema-inferred content supplied to the renderer. */
export type OrbitalSystemInput = z.output<typeof orbitalSystemInputSchema>;
