import { z } from "zod";
import { createLabelSchema } from "../legacy/createLabelSchema";

/** Strict authored content within the fixed DotMatrix layout. */
export const dotMatrixInputSchema = z
  .strictObject({
    groups: z
      .array(
        z.strictObject({
          label: createLabelSchema({
            maxLength: 16,
            bounds: { fontSize: 17, width: 124 },
          }),
          value: z.number().int().min(0).max(100),
          selected: z.boolean(),
        }),
      )
      .min(1)
      .max(4),
    heading: createLabelSchema({
      maxLength: 52,
      bounds: { fontSize: 31, width: 620 },
    }),
    cohortLabel: createLabelSchema({
      maxLength: 24,
      bounds: { fontSize: 15, width: 148 },
    }),
    showLegend: z.boolean(),
  })
  .refine(
    (input) =>
      input.groups.reduce((sum, group) => sum + group.value, 0) >= 1 &&
      input.groups.reduce((sum, group) => sum + group.value, 0) <= 100,
    {
      path: ["groups"],
      message: "The cohort must contain 1 to 100 authored examples.",
    },
  ) satisfies z.ZodType;

/** Schema-inferred content supplied to the renderer. */
export type DotMatrixInput = z.output<typeof dotMatrixInputSchema>;
