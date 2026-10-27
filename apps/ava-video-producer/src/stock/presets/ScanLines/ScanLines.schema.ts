import { z } from "zod";
import { createLabelSchema } from "../legacy/createLabelSchema";

/** Strict authored content within the fixed ScanLines layout. */
export const scanLinesInputSchema: z.ZodObject<
  { fields: z.ZodArray<z.ZodString>; showChecks: z.ZodBoolean },
  z.core.$strict
> = z.strictObject({
  fields: z
    .array(
      createLabelSchema({
        maxLength: 20,
        bounds: { fontSize: 18, width: 220, mono: true },
      }),
    )
    .min(1)
    .max(6),
  showChecks: z.boolean(),
});

/** Schema-inferred content supplied to the renderer. */
export type ScanLinesInput = z.output<typeof scanLinesInputSchema>;
