import { z } from "zod";
import type { StockSemanticRule } from "../../contracts/StockContract.types";

const optionSchema: z.ZodObject<
  { label: z.ZodString; reason: z.ZodString },
  z.core.$strict
> = z.strictObject({
  label: z.string().min(1).max(24),
  reason: z.string().min(1).max(42),
});
/**
 * Complete authored selection criterion, options, rationales and marker
 * styling.
 */
export const inputSchema = z.strictObject({
  criterion: z.string().min(1).max(58),
  rejected: optionSchema,
  replacement: optionSchema,
  decisionLabels: z.strictObject({
    rejected: z.string().min(1).max(16),
    selected: z.string().min(1).max(16),
  }),
  showCriterionLink: z.boolean(),
  rejectionMark: z.enum(["cross", "strike"]),
}) satisfies z.ZodType;
/** Schema-inferred replacement content. */
export type Input = z.output<typeof inputSchema>;
/** No additional relations exist beyond this fixed two-option structure. */
export const SEMANTIC_RULES: StockSemanticRule[] = [];
