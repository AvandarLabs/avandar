import { propEq, prop } from "@avandar/utils";
import { z } from "zod";
import type { StockSemanticRule } from "../../contracts/StockContract.types";
/** Complete authored input. No partial-input defaults or inferred values. */
export const inputSchema = z
  .strictObject({
    categories: z
      .array(
        z.strictObject({
          id: z.string().min(0).max(18),
          label: z.string().min(0).max(22),
          value: z.number().finite().min(0).max(10000),
        }),
      )
      .min(2)
      .max(5),
    axisMaximum: z.number().finite().positive(),
    unitLabel: z.string().min(1).max(20),
    focusId: z.string().min(0).max(18).nullable(),
    treatment: z.enum(["direct-labels", "focus", "both"]),
    headings: z.strictObject({
      title: z.string().min(1).max(42),
      before: z.string().min(1).max(28),
      after: z.string().min(1).max(28),
    }),
    showValueLabels: z.boolean(),
    showBeforeGuide: z.boolean(),
  })
  .superRefine((input, context) => {
    if (
      new Set(input.categories.map(prop("id"))).size !== input.categories.length
    ) {
      context.addIssue({
        code: "custom",
        path: ["categories"],
        message: "Collection IDs must be unique.",
      });
    }
    if (input.categories.some((item) => item.value > input.axisMaximum)) {
      context.addIssue({
        code: "custom",
        path: ["axisMaximum"],
        message: "The common scale must contain every value.",
      });
    }
    if (
      input.focusId !== null &&
      !input.categories.some(
        propEq<{ id: unknown }, "id", unknown>("id", input.focusId),
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["focusId"],
        message: "Focus must reference a category.",
      });
    }
    if (input.treatment !== "direct-labels" && input.focusId === null) {
      context.addIssue({
        code: "custom",
        path: ["focusId"],
        message: "Focus treatment requires a selected category.",
      });
    }
  }) satisfies z.ZodType;
/** Schema-inferred renderer input. */
export type Input = z.output<typeof inputSchema>;
/** Runtime constraints beyond structural JSON Schema. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "categories-unique-ids",
    paths: ["categories.*.id"],
    description: "Collection IDs must be unique.",
  },
  {
    id: "fixed-scale",
    paths: ["axisMaximum", "categories.*.value"],
    description:
      "The positive axis maximum must contain every category value and stays fixed throughout the animation.",
  },
  {
    id: "existing-focus",
    paths: ["focusId", "categories.*.id", "treatment"],
    description:
      "A non-null focus references an existing category. Focus and both require a non-null focus.",
  },
];
