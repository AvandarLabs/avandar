import { z } from "zod";
import { createLabelSchema } from "../legacy/createLabelSchema";
import { legacyColorSchema } from "../legacy/legacyColorSchema.constants";

/** Strict authored content within the fixed StaggerCards layout. */
export const staggerCardsInputSchema: z.ZodObject<
  {
    cards: z.ZodArray<
      z.ZodObject<
        { label: z.ZodString; detail: z.ZodString; color: z.ZodString },
        z.core.$strict
      >
    >;
    heading: z.ZodString;
    showChecks: z.ZodBoolean;
  },
  z.core.$strict
> = z.strictObject({
  cards: z
    .array(
      z.strictObject({
        label: createLabelSchema({
          maxLength: 14,
          bounds: { fontSize: 26, width: 214 },
        }),
        detail: createLabelSchema({
          maxLength: 24,
          bounds: { fontSize: 16, width: 190 },
        }),
        color: legacyColorSchema,
      }),
    )
    .min(1)
    .max(6),
  heading: createLabelSchema({
    maxLength: 52,
    bounds: { fontSize: 31, width: 832 },
  }),
  showChecks: z.boolean(),
});

/** Schema-inferred content supplied to the renderer. */
export type StaggerCardsInput = z.output<typeof staggerCardsInputSchema>;
