import { z } from "zod";
import type { StockSemanticRule } from "../../contracts/StockContract.types";
/** Complete authored input structure. */
export const inputSchema = z.strictObject({
  invoice: z.strictObject({
    procedureCode: z.string().min(1).max(14),
    providerKey: z.string().min(1).max(22),
    payerKey: z.string().min(1).max(22),
    periodLabel: z.string().min(1).max(20),
    quantity: z.number().int().min(1).max(5),
    unitPriceMinor: z.number().int().min(0).max(1000000),
  }),
  reference: z.strictObject({
    procedureCode: z.string().min(1).max(14),
    providerKey: z.string().min(1).max(22),
    payerKey: z.string().min(1).max(22),
    periodLabel: z.string().min(1).max(20),
    quantity: z.number().int().min(1).max(5),
    unitPriceMinor: z.number().int().min(0).max(1000000),
    sourceLabel: z.string().min(1).max(34),
  }),
  money: z.strictObject({
    currencyLabel: z.string().min(1).max(18),
    minorUnitsPerUnit: z.union([z.literal(1), z.literal(100)]),
  }),
  copy: z.strictObject({
    invoice: z.string().min(1).max(32),
    reference: z.string().min(1).max(32),
    procedure: z.string().min(1).max(16),
    provider: z.string().min(1).max(16),
    payer: z.string().min(1).max(16),
    period: z.string().min(1).max(16),
    quantity: z.string().min(1).max(16),
    matched: z.string().min(1).max(32),
    unmatched: z.string().min(1).max(32),
    difference: z.string().min(1).max(32),
    review: z.string().min(1).max(52),
    example: z.string().min(1).max(52),
  }),
  focus: z.union([z.literal("keys"), z.literal("amounts")]),
  showDifference: z.boolean(),
}) satisfies z.ZodType;
/** Accepted output inferred from runtime validation. */
export type Input = z.output<typeof inputSchema>;
/** Runtime cross-field rules and scene eligibility beyond JSON Schema. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "comparison-eligibility",
    paths: ["invoice", "reference"],
    description:
      "All four context strings and quantity must match exactly before any numeric or geometric difference. Mismatched inputs remain valid unresolved scenes.",
  },
];
