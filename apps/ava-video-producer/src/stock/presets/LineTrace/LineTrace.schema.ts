import { z } from "zod";
import { createLabelSchema } from "../legacy/createLabelSchema";

/** Strict authored content within the fixed LineTrace layout. */
export const lineTraceInputSchema = z
  .strictObject({
    points: z.array(z.number().min(0).max(100)).min(2).max(12),
    reference: z.array(z.number().min(0).max(100)).min(2).max(12),
    heading: createLabelSchema({
      maxLength: 52,
      bounds: { fontSize: 29, width: 832 },
    }),
    seriesLabel: createLabelSchema({
      maxLength: 16,
      bounds: { fontSize: 15, width: 105 },
    }),
    referenceLabel: createLabelSchema({
      maxLength: 16,
      bounds: { fontSize: 15, width: 170 },
    }),
    showReference: z.boolean(),
  })
  .refine((input) => input.points.length === input.reference.length, {
    path: ["reference"],
    message: "The reference must have the same number of sample periods.",
  }) satisfies z.ZodType;

/** Schema-inferred content supplied to the renderer. */
export type LineTraceInput = z.output<typeof lineTraceInputSchema>;
