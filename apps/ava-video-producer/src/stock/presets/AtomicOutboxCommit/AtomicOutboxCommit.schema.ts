import { z } from "zod";
import type {
  StockJsonSchema,
  StockSemanticRule,
} from "../../contracts/StockContract.types";
/** One atomic outcome preserves the edit and its matching obligation. */
export const inputSchema = z
  .strictObject({
    change: z.strictObject({
      id: z.string().min(1).max(16),
      recordLabel: z.string().max(28),
      before: z.string().max(24),
      after: z.string().max(24),
    }),
    outcome: z.enum(["commit", "abort"]),
    labels: z.strictObject({
      local: z.string().min(1).max(26),
      outbox: z.string().min(1).max(26),
      pending: z.string().min(1).max(26),
      committed: z.string().min(1).max(26),
      aborted: z.string().min(1).max(26),
    }),
    showIdentifier: z.boolean(),
    copy: z.strictObject({
      context: z.string().min(1).max(38),
      before: z.string().min(1).max(38),
      after: z.string().min(1).max(38),
    }),
  })
  .superRefine((input, context) => {
    if (input.change.before === input.change.after) {
      context.addIssue({
        code: "custom",
        path: ["change", "after"],
        message: "Before and after must differ exactly, including whitespace.",
      });
    }
  }) satisfies z.ZodType;
/** Inferred complete authored input. */
export type Input = z.output<typeof inputSchema>;
/** Full structural schema. Semantic constraints remain runtime validated. */
export const jsonSchema: StockJsonSchema = z.toJSONSchema(inputSchema);
/** Explicit runtime invariants beyond structural JSON Schema. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "distinct-change",
    paths: ["change.before", "change.after"],
    description:
      "Before and after differ as exact strings. Empty values and whitespace are preserved. A single outcome commits the local after value and exactly one matching pending durable ticket together, or neither.",
  },
];
