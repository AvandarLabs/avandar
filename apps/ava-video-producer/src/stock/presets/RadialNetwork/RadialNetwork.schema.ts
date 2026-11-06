import { z } from "zod";
import { createLabelSchema } from "../legacy/createLabelSchema";

/** Strict authored content within the fixed RadialNetwork layout. */
export const radialNetworkInputSchema: z.ZodObject<
  {
    hub: z.ZodObject<
      { label: z.ZodString; detail: z.ZodString },
      z.core.$strict
    >;
    spokes: z.ZodArray<z.ZodString>;
    showOrbit: z.ZodBoolean;
  },
  z.core.$strict
> = z.strictObject({
  hub: z.strictObject({
    label: createLabelSchema({
      maxLength: 24,
      bounds: { fontSize: 25, width: 116 },
    }),
    detail: createLabelSchema({
      maxLength: 24,
      bounds: { fontSize: 12, width: 116 },
    }),
  }),
  spokes: z
    .array(
      createLabelSchema({
        maxLength: 12,
        bounds: { fontSize: 18, width: 140 },
      }),
    )
    .min(1)
    .max(8),
  showOrbit: z.boolean(),
});

/** Schema-inferred content supplied to the renderer. */
export type RadialNetworkInput = z.output<typeof radialNetworkInputSchema>;
