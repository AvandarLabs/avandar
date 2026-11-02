import { z } from "zod";
import { createLabelSchema } from "../legacy/createLabelSchema";
import { legacyColorSchema } from "../legacy/legacyColorSchema.constants";

/** Strict authored content within the fixed BarRace layout. */
export const barRaceInputSchema = z
  .strictObject({
    bars: z
      .array(
        z.strictObject({
          label: createLabelSchema({
            maxLength: 12,
            bounds: { fontSize: 23, width: 113 },
          }),
          start: z.number().min(0).max(100),
          end: z.number().min(0).max(100),
          from: z.number().int().min(0).max(3),
          to: z.number().int().min(0).max(3),
          color: legacyColorSchema,
        }),
      )
      .min(1)
      .max(4),
    heading: createLabelSchema({
      maxLength: 52,
      bounds: { fontSize: 29, width: 832 },
    }),
    showLegend: z.boolean(),
  })
  .superRefine((input, context) => {
    (["from", "to"] as const).forEach((field) => {
      const ranks = input.bars.map((bar) => bar[field]);
      if (
        new Set(ranks).size !== ranks.length ||
        ranks.some((rank) => rank >= input.bars.length)
      ) {
        context.addIssue({
          code: "custom",
          path: ["bars"],
          message: "Each period needs one distinct rank per authored bar.",
        });
      }
    });
  }) satisfies z.ZodType;

/** Schema-inferred content supplied to the renderer. */
export type BarRaceInput = z.output<typeof barRaceInputSchema>;
