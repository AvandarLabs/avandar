import { prop } from "@avandar/utils";
import { z } from "zod";
import type { StockSemanticRule } from "../../contracts/StockContract.types";

/** The two authored alternatives retain equal editorial attention. */
export const alternativeSchema: z.ZodObject<
  { id: z.ZodString; label: z.ZodString },
  z.core.$strict
> = z.strictObject({
  id: z.string().max(20),
  label: z.string().min(1).max(24),
});
/** One explicitly paired qualitative criterion. */
export const criterionSchema = z.strictObject({
  id: z.string().max(20),
  label: z.string().max(20),
  leftText: z.string().max(34),
  rightText: z.string().max(34),
}) satisfies z.ZodType;
/** Complete comparison content with explicit authored emphasis. */
export const inputSchema = z
  .strictObject({
    question: z.string().min(1).max(60),
    alternatives: z.array(alternativeSchema).length(2),
    criteria: z.array(criterionSchema).min(1).max(3),
    focusCriterionId: z.string().max(20),
    comparisonLabel: z.string().max(48),
    showPairBrackets: z.boolean(),
  })
  .superRefine((input, context) => {
    Array.from(["alternatives", "criteria"] as const).forEach((field) => {
      if (
        new Set(input[field].map(prop<{ id: string }, "id", string>("id")))
          .size !== input[field].length
      ) {
        context.addIssue({
          code: "custom",
          path: [field],
          message: "IDs must be unique within their collection.",
        });
      }
    });
    if (!input.criteria.some(({ id }) => id === input.focusCriterionId)) {
      context.addIssue({
        code: "custom",
        path: ["focusCriterionId"],
        message: "Focus must reference an authored criterion.",
      });
    }
  }) satisfies z.ZodType;
/** Schema-inferred authored renderer content. */
export type Input = z.output<typeof inputSchema>;
/** Relationships not expressible in the structural JSON Schema. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "unique-ids",
    paths: ["alternatives.*.id", "criteria.*.id"],
    description: "IDs are unique within each collection.",
  },
  {
    id: "criterion-focus-reference",
    paths: ["focusCriterionId", "criteria.*.id"],
    description: "Focus references an authored criterion.",
  },
];
