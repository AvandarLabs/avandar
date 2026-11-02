import { prop } from "@avandar/utils";
import { z } from "zod";
import type { StockSemanticRule } from "../../contracts/StockContract.types";
/** One authored qualitative gain or concession. */
export const pointSchema: z.ZodObject<
  { id: z.ZodString; label: z.ZodString },
  z.core.$strict
> = z.strictObject({
  id: z.string().max(20),
  label: z.string().min(1).max(32),
});
/**
 * Complete qualitative tradeoff. Counts and hinge angles never become scores.
 */
export const inputSchema = z
  .strictObject({
    approach: z.string().min(1).max(40),
    gains: z.array(pointSchema).min(1).max(3),
    concessions: z.array(pointSchema).min(1).max(3),
    sideLabels: z.strictObject({
      gain: z.string().min(1).max(22),
      concession: z.string().min(1).max(22),
    }),
    priorityStatement: z.string().min(1).max(58),
    revealOrder: z.enum(["gain-first", "concession-first"]),
  })
  .superRefine((input, context) => {
    Array.from(["gains", "concessions"] as const).forEach((field) => {
      if (new Set(input[field].map(prop("id"))).size !== input[field].length) {
        context.addIssue({
          code: "custom",
          path: [field],
          message: "IDs must be unique within each side.",
        });
      }
    });
  }) satisfies z.ZodType;
/** Schema-inferred content, with no quantitative weights. */
export type Input = z.output<typeof inputSchema>;
/** IDs identify authored points only within their side. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "unique-side-ids",
    paths: ["gains.*.id", "concessions.*.id"],
    description:
      "Each side has unique point IDs. Counts are never interpreted as weights or scores.",
  },
];
