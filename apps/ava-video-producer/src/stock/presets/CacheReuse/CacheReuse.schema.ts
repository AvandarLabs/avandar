import { z } from "zod";
import type {
  StockJsonSchema,
  StockSemanticRule,
} from "../../contracts/StockContract.types";
/** Strict complete input preserves accepted bounds and identities. */
export const inputSchema = z.strictObject({
  request: z.strictObject({
    key: z.string().min(1).max(20),
    label: z.string().min(1).max(24),
  }),
  result: z.strictObject({
    label: z.string().min(1).max(20),
    value: z.string().min(1).max(28),
  }),
  systemLabels: z.strictObject({
    requester: z.string().min(1).max(22),
    cache: z.string().min(1).max(22),
    origin: z.string().min(1).max(22),
  }),
  pathLabels: z.strictObject({
    miss: z.string().min(1).max(26),
    store: z.string().min(1).max(26),
    hit: z.string().min(1).max(26),
  }),
  showStoredValue: z.boolean(),
  showPathLabels: z.boolean(),
}) satisfies z.ZodType;
/** Input inferred from strict runtime validation. */
export type Input = z.output<typeof inputSchema>;
/** Structural schema. Semantic rules are enforced by runtime validation. */
export const jsonSchema: StockJsonSchema = z.toJSONSchema(inputSchema);
/** Cross-field invariants beyond structural validation. */
export const SEMANTIC_RULES: StockSemanticRule[] = [];
