import { prop } from "@avandar/utils";
import { z } from "zod";
import type { StockSemanticRule } from "../../contracts/StockContract.types";
/** Strict complete authored input. No field-level defaults or coercion. */
export const inputSchema = z
  .strictObject({
    cells: z
      .array(
        z.strictObject({
          id: z.string().max(12),
          label: z.string().max(16),
          count: z.number().int().min(0).max(100).nullable(),
        }),
      )
      .min(3)
      .max(6),
    minimum: z.number().int().min(2).max(20),
    labels: z.strictObject({
      local: z.string().min(1).max(30),
      public: z.string().min(1).max(30),
      suppressed: z.string().min(1).max(30),
      missing: z.string().min(1).max(30),
      zero: z.string().min(1).max(30),
    }),
    showLocalCounts: z.boolean(),
    copy: z.strictObject({
      context: z.string().min(1).max(40),
      before: z.string().min(1).max(40),
      after: z.string().min(1).max(40),
    }),
  })
  .superRefine((input, context) => {
    if (new Set(input.cells.map(prop("id"))).size !== input.cells.length) {
      context.addIssue({
        code: "custom",
        path: ["cells"],
        message: "Cell IDs must be unique.",
      });
    }
  }) satisfies z.ZodType;
/** Schema-inferred accepted input. */
export type Input = z.infer<typeof inputSchema>;
/** Runtime semantic rules and derived invariants. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "unique-cells",
    paths: ["cells.*.id"],
    description: "Cell IDs must be unique, including at most one empty ID.",
  },
  {
    id: "public-release",
    paths: ["cells.*.count", "minimum"],
    description:
      "Null is missing, zero is reported zero, positive counts below minimum are suppressed, and counts at least minimum are released. Public suppressed copies contain no actual count or recoverable grand total. Local numeric presentation follows showLocalCounts.",
  },
];
