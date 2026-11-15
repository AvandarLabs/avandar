import { prop } from "@avandar/utils";
import { z } from "zod";
import type { StockSemanticRule } from "../../contracts/StockContract.types";
/** Strict complete authored input. No field-level defaults or coercion. */
export const inputSchema = z
  .strictObject({
    rows: z
      .array(
        z.strictObject({
          id: z.string().max(12),
          latitude: z.union([
            z.number().min(-360).max(360),
            z.string().max(10),
            z.null(),
          ]),
          longitude: z.union([
            z.number().min(-360).max(360),
            z.string().max(10),
            z.null(),
          ]),
        }),
      )
      .min(2)
      .max(6),
    labels: z.strictObject({
      plotted: z.string().min(1).max(28),
      missing: z.string().min(1).max(28),
      nonNumeric: z.string().min(1).max(28),
      range: z.string().min(1).max(28),
      total: z.string().min(1).max(28),
    }),
    showValues: z.boolean(),
    copy: z.strictObject({
      context: z.string().min(1).max(40),
      before: z.string().min(1).max(40),
      after: z.string().min(1).max(40),
    }),
  })
  .superRefine((input, context) => {
    if (new Set(input.rows.map(prop("id"))).size !== input.rows.length) {
      context.addIssue({
        code: "custom",
        path: ["rows"],
        message: "Row IDs must be unique.",
      });
    }
  }) satisfies z.ZodType;
/** Schema-inferred accepted input. */
export type Input = z.infer<typeof inputSchema>;
/** Runtime semantic rules and derived invariants. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "unique-rows",
    paths: ["rows.*.id"],
    description: "Row IDs must be unique, including at most one empty ID.",
  },
  {
    id: "coordinate-priority",
    paths: ["rows.*.latitude", "rows.*.longitude"],
    description:
      "Classify missing before type before range. Both coordinates must be numbers, latitude within inclusive -90..90 and longitude within inclusive -180..180 to plot. Numeric strings and empty strings remain type errors. No coercion, swap or removal. Plotted and three rejected counts sum exactly to rows.length.",
  },
];
