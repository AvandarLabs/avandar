import { z } from "zod";
import type {
  StockJsonSchema,
  StockSemanticRule,
} from "../../contracts/StockContract.types";
/** Strict complete input preserves accepted bounds and identities. */
export const inputSchema = z
  .strictObject({
    attempts: z
      .array(
        z.strictObject({
          label: z.string().max(16),
          outcome: z.enum(["retry", "complete", "stop"]),
          delayAfter: z.number().int().min(0).max(16),
        }),
      )
      .min(3)
      .max(4),
    operationLabel: z.string().min(1).max(24),
    outcomeLabels: z.strictObject({
      retry: z.string().min(1).max(18),
      complete: z.string().min(1).max(18),
      stop: z.string().min(1).max(18),
      wait: z.string().min(1).max(18),
    }),
    delayUnit: z.string().min(1).max(12),
    showDelayValues: z.boolean(),
    showAttemptLabels: z.boolean(),
  })
  .superRefine((input, context) => {
    input.attempts.forEach((attempt, index) => {
      const isFinal = index === input.attempts.length - 1;
      const previousDelay = index ? input.attempts[index - 1].delayAfter : 0;
      if (
        isFinal
          ? attempt.outcome === "retry" || attempt.delayAfter !== 0
          : attempt.outcome !== "retry" || attempt.delayAfter <= previousDelay
      ) {
        context.addIssue({
          code: "custom",
          path: ["attempts", index],
          message:
            "Retries need increasing positive waits and one final complete or stop outcome.",
        });
      }
    });
  }) satisfies z.ZodType;
/** Input inferred from strict runtime validation. */
export type Input = z.output<typeof inputSchema>;
/** Structural schema. Semantic rules are enforced by runtime validation. */
export const jsonSchema: StockJsonSchema = z.toJSONSchema(inputSchema);
/** Cross-field invariants beyond structural validation. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "ordered-retries",
    paths: ["attempts"],
    description:
      "Three or four attempts. Every nonfinal outcome is retry, with positive strictly increasing integer waits. The final outcome is complete or stop with no following wait.",
  },
];
