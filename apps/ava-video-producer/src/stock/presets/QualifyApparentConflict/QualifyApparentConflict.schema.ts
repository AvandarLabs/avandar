import { prop } from "@avandar/utils";
import { z } from "zod";
import type { StockSemanticRule } from "../../contracts/StockContract.types";
/** Complete authored content with strict nested fields and accepted bounds. */
export const inputSchema = z
  .strictObject({
    statements: z
      .array(
        z.strictObject({
          id: z.string().max(20),
          claim: z.string().min(1).max(42),
          context: z.string().min(1).max(32),
        }),
      )
      .min(2)
      .max(2),
    openingLabel: z.string().min(1).max(26),
    qualifier: z.string().min(1).max(64),
    connectorLabel: z.string().min(1).max(26),
    contextPlacement: z.enum(["above", "below"]),
    showCentralDivider: z.boolean(),
  })
  .superRefine((input, context) => {
    if (
      new Set(input.statements.map(prop("id"))).size !== input.statements.length
    ) {
      context.addIssue({
        code: "custom",
        path: ["statements"],
        message: "Collection IDs must be unique.",
      });
    }
  }) satisfies z.ZodType;
/** Schema-inferred renderer input. */
export type Input = z.output<typeof inputSchema>;
/** Authored relationships beyond structural JSON Schema. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "statements-unique-ids",
    paths: ["statements.*.id"],
    description: "Collection IDs must be unique.",
  },
];
