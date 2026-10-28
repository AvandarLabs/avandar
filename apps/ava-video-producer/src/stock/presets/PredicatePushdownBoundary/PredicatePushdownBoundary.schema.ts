import { prop } from "@avandar/utils";
import { z } from "zod";
import type { StockSemanticRule } from "../../contracts/StockContract.types";
const baseSchema = z.strictObject({
  rows: z
    .array(
      z.strictObject({
        id: z.string().max(12),
        value: z.number().min(-100).max(100),
      }),
    )
    .min(2)
    .max(8),
  predicate: z.strictObject({
    operator: z.enum([">=", "<="]),
    threshold: z.number().min(-100).max(100),
  }),
  metric: z.strictObject({
    label: z.string().min(1).max(22),
    unit: z.string().min(1).max(22),
    rowUnit: z.string().min(1).max(22),
  }),
  labels: z.strictObject({
    source: z.string().min(1).max(28),
    destination: z.string().min(1).max(28),
    condition: z.string().min(1).max(28),
    retained: z.string().min(1).max(28),
    transferred: z.string().min(1).max(28),
  }),
  showTotals: z.boolean(),
  copy: z.strictObject({
    context: z.string().min(1).max(34),
    source: z.string().min(1).max(34),
    result: z.string().min(1).max(34),
  }),
}) satisfies z.ZodType;
/** Inclusive source predicate over unique immutable source rows. */
export const inputSchema = baseSchema.superRefine((input, context) => {
  if (new Set(input.rows.map(prop("id"))).size !== input.rows.length) {
    context.addIssue({
      code: "custom",
      path: ["rows"],
      message: "Source IDs must be unique.",
    });
  }
}) satisfies z.ZodType;
/** Complete strict schema output. */
export type Input = z.output<typeof inputSchema>;
/** Runtime cross-field constraints beyond structural JSON Schema. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "unique-source",
    paths: ["rows.*.id"],
    description:
      "Source row IDs are unique, including at most one empty ID. Inclusive numeric membership derives only from rows and predicate. Transferred plus excluded equals source row count, and originals persist.",
  },
];
