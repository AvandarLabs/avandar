import { z } from "zod";
import type { StockSemanticRule } from "../../contracts/StockContract.types";
/** One estimate and its optional reference share fixed finite axis bounds. */
export const inputSchema = z
  .strictObject({
    estimate: z.strictObject({
      label: z.string().min(1).max(32),
      point: z.number(),
      lower: z.number(),
      upper: z.number(),
    }),
    axis: z.strictObject({
      min: z.number(),
      max: z.number(),
      unit: z.string().min(1).max(16),
    }),
    interval: z.strictObject({
      kind: z.enum([
        "scenario-range",
        "confidence-interval",
        "measurement-range",
      ]),
      label: z.string().min(1).max(64),
    }),
    reference: z
      .strictObject({ value: z.number(), label: z.string().min(1).max(32) })
      .nullable(),
    interpretation: z.string().min(1).max(80),
    showValues: z.boolean(),
    contextLabel: z.string().min(1).max(64),
  })
  .superRefine((input, context) => {
    const { estimate, axis, reference } = input;
    if (!(axis.min < axis.max)) {
      context.addIssue({
        code: "custom",
        path: ["axis"],
        message: "Axis minimum must be less than maximum.",
      });
    }
    if (
      !(
        estimate.lower <= estimate.point &&
        estimate.point <= estimate.upper &&
        estimate.lower < estimate.upper &&
        estimate.lower >= axis.min &&
        estimate.upper <= axis.max
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["estimate"],
        message:
          "The ordered nonzero interval and its point must lie within the fixed axis.",
      });
    }
    if (
      reference &&
      (reference.value < axis.min || reference.value > axis.max)
    ) {
      context.addIssue({
        code: "custom",
        path: ["reference", "value"],
        message: "Reference must lie within the fixed axis.",
      });
    }
  }) satisfies z.ZodType;
/** Schema-inferred complete input. */
export type Input = z.output<typeof inputSchema>;
/** Semantic and author-verified interpretation constraints. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "fixed-increasing-axis",
    paths: ["axis.min", "axis.max"],
    description: "Finite axis minimum is strictly less than maximum.",
  },
  {
    id: "ordered-contained-interval",
    paths: ["estimate", "axis"],
    description:
      "Axis min <= lower <= point <= upper <= axis max, with lower < upper.",
  },
  {
    id: "contained-reference",
    paths: ["reference", "axis"],
    description: "A non-null finite reference is inside the same fixed axis.",
  },
  {
    id: "authored-meaning",
    paths: ["interval", "interpretation"],
    description:
      "The author must supply the appropriate interval meaning, any confidence level and method, and a numerically consistent interpretation. The renderer infers none of these.",
  },
];
