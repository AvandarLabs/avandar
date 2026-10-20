import { prop } from "@avandar/utils";
import { z } from "zod";
import type { StockSemanticRule } from "../../contracts/StockContract.types";
/** Strict complete authored input. No field-level defaults or coercion. */
export const inputSchema = z
  .strictObject({
    points: z
      .array(
        z.strictObject({
          id: z.string().max(12),
          x: z.number().min(0).max(100),
          y: z.number().min(0).max(100),
        }),
      )
      .min(1)
      .max(12),
    grid: z.strictObject({
      columns: z.number().int().min(2).max(3),
      rows: z.number().int().min(2).max(3),
    }),
    labels: z.strictObject({
      unit: z.string().min(1).max(30),
      zero: z.string().min(1).max(30),
      total: z.string().min(1).max(30),
    }),
    showPointGhosts: z.boolean(),
    copy: z.strictObject({
      context: z.string().min(1).max(40),
      before: z.string().min(1).max(40),
      after: z.string().min(1).max(40),
    }),
  })
  .superRefine((input, context) => {
    if (new Set(input.points.map(prop("id"))).size !== input.points.length) {
      context.addIssue({
        code: "custom",
        path: ["points"],
        message: "Point IDs must be unique.",
      });
    }
    if (input.grid.columns !== input.grid.rows) {
      context.addIssue({
        code: "custom",
        path: ["grid"],
        message: "Grid rows and columns must be equal.",
      });
    }
  }) satisfies z.ZodType;
/** Schema-inferred accepted input. */
export type Input = z.infer<typeof inputSchema>;
/** Runtime semantic rules and derived invariants. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "unique-points",
    paths: ["points.*.id"],
    description: "Point IDs must be unique, including at most one empty ID.",
  },
  {
    id: "square-grid",
    paths: ["grid.columns", "grid.rows"],
    description:
      "Rows and columns must be equal integers from 2 through 3. Cells use lower-inclusive, upper-exclusive boundaries, except the inclusive outer maximum. Each supplied point contributes exactly once.",
  },
];
