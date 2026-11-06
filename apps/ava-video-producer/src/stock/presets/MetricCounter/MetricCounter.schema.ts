import { z } from "zod";
import { createLabelSchema } from "../legacy/createLabelSchema";
import { getLegacyWidthFromText } from "../legacy/getLegacyWidthFromText/getLegacyWidthFromText";

/** Strict authored content within the fixed MetricCounter layout. */
export const metricCounterInputSchema = z
  .strictObject({
    value: z.number().int().min(0).max(999999),
    unit: z
      .string()
      .max(8)
      .regex(/^[^\r\n\t]*$/),
    label: createLabelSchema({
      maxLength: 40,
      bounds: { fontSize: 20, width: 620 },
    }),
    bars: z.array(z.number().min(0).max(1)).min(1).max(12),
    showBars: z.boolean(),
  })
  .refine(
    (input) =>
      getLegacyWidthFromText({
        text: `${input.value.toLocaleString("en-US")}${input.unit}`,
        fontSize: 103,
      }) <= 624,
    {
      path: ["unit"],
      message: "The complete metric and unit must fit the fixed display.",
    },
  ) satisfies z.ZodType;

/** Schema-inferred content supplied to the renderer. */
export type MetricCounterInput = z.output<typeof metricCounterInputSchema>;
