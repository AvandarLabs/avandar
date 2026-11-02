import { prop } from "@avandar/utils";
import { z } from "zod";
import type { StockSemanticRule } from "../../contracts/StockContract.types";
/** Complete authored input. No partial-input defaults or inferred values. */
export const inputSchema = z
  .strictObject({
    title: z.string().min(1).max(46),
    rows: z
      .array(
        z.strictObject({
          id: z.string().min(0).max(16),
          before: z.string().min(0).max(24),
          after: z.string().min(0).max(24),
          editLabel: z.string().min(0).max(28),
        }),
      )
      .min(2)
      .max(5),
    columnLabels: z.strictObject({
      original: z.string().min(1).max(22),
      result: z.string().min(1).max(22),
      change: z.string().min(1).max(22),
    }),
    showWhitespace: z.boolean(),
    comparison: z.enum(["side-rail", "inline-ghost"]),
    showEditLabels: z.boolean(),
  })
  .superRefine((input, context) => {
    if (new Set(input.rows.map(prop("id"))).size !== input.rows.length) {
      context.addIssue({
        code: "custom",
        path: ["rows"],
        message: "Collection IDs must be unique.",
      });
    }
  }) satisfies z.ZodType;
/** Schema-inferred renderer input. */
export type Input = z.output<typeof inputSchema>;
/** Runtime constraints beyond structural JSON Schema. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "rows-unique-ids",
    paths: ["rows.*.id"],
    description: "Collection IDs must be unique.",
  },
];
