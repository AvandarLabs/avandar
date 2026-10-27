import { prop } from "@avandar/utils";
import { z } from "zod";
import type { StockSemanticRule } from "../../contracts/StockContract.types";
/** Complete authored content with strict nested fields and accepted bounds. */
export const inputSchema = z
  .strictObject({
    approaches: z
      .array(
        z.strictObject({
          id: z.string().max(20),
          label: z.string().min(1).max(24),
          distinction: z.string().min(1).max(36),
        }),
      )
      .min(2)
      .max(2),
    sharedPrinciple: z.string().min(1).max(58),
    foundationLabel: z.string().min(1).max(26),
    openingConnector: z.string().min(0).max(26),
    showDistinctTraits: z.boolean(),
    foundationReveal: z.enum(["join", "uncover"]),
  })
  .superRefine((input, context) => {
    if (
      new Set(input.approaches.map(prop("id"))).size !== input.approaches.length
    ) {
      context.addIssue({
        code: "custom",
        path: ["approaches"],
        message: "Collection IDs must be unique.",
      });
    }
  }) satisfies z.ZodType;
/** Schema-inferred renderer input. */
export type Input = z.output<typeof inputSchema>;
/** Authored relationships beyond structural JSON Schema. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "approaches-unique-ids",
    paths: ["approaches.*.id"],
    description: "Collection IDs must be unique.",
  },
];
