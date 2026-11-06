import { z } from "zod";
import type {
  StockJsonSchema,
  StockSemanticRule,
} from "../../contracts/StockContract.types";
/** Supplied rectangular data and an explicitly selected evidence signal. */
export const inputSchema = z
  .strictObject({
    grid: z.strictObject({
      columnLabels: z.array(z.string().min(1).max(16)).min(2).max(4),
      rows: z
        .array(z.array(z.string().max(18)).min(2).max(4))
        .min(2)
        .max(4),
    }),
    signal: z.enum(["tagged-cells", "ruling-lines", "whitespace"]),
    evidenceLabel: z.string().min(1).max(48),
    showSourceLinks: z.boolean(),
    copy: z.strictObject({
      context: z.string().min(1).max(34),
      source: z.string().min(1).max(34),
      result: z.string().min(1).max(34),
    }),
  })
  .superRefine((input, context) => {
    input.grid.rows.forEach((row, index) => {
      if (row.length !== input.grid.columnLabels.length) {
        context.addIssue({
          code: "custom",
          path: ["grid", "rows", index],
          message: "Every row must have the supplied column count.",
        });
      }
    });
  }) satisfies z.ZodType;
/** Inferred complete authored input. */
export type Input = z.output<typeof inputSchema>;
/** Full structural schema. Semantic constraints remain runtime validated. */
export const jsonSchema: StockJsonSchema = z.toJSONSchema(inputSchema);
/** Explicit runtime invariants beyond structural JSON Schema. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "rectangular-rows",
    paths: ["grid.columnLabels", "grid.rows.*"],
    description:
      "All 2..4 data rows have exactly the 2..4 supplied column lengths. Empty, repeated and whitespace values remain distinct coordinate occurrences. Whitespace evidence always carries an inferred-layout qualifier; agreement of authored evidence prose is an authoring responsibility.",
  },
];
