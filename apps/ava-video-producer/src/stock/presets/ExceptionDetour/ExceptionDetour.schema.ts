import { z } from "zod";
import type { StockSemanticRule } from "../../contracts/StockContract.types";
/** Complete authored content with strict nested fields and accepted bounds. */
export const inputSchema = z.strictObject({
  rule: z.strictObject({
    label: z.string().min(1).max(48),
    outcome: z.string().min(1).max(24),
  }),
  exception: z.strictObject({
    condition: z.string().min(1).max(34),
    outcome: z.string().min(1).max(24),
  }),
  caseLabel: z.string().min(1).max(34),
  pathLabels: z.strictObject({
    standard: z.string().min(1).max(18),
    exception: z.string().min(1).max(18),
  }),
  showStandardReference: z.boolean(),
  detourSide: z.enum(["above", "below"]),
}) satisfies z.ZodType;
/** Schema-inferred renderer input. */
export type Input = z.output<typeof inputSchema>;
/** Authored relationships beyond structural JSON Schema. */
export const SEMANTIC_RULES: StockSemanticRule[] = [];
