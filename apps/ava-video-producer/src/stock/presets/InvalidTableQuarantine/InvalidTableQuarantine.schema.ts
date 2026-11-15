import { z } from "zod";
import type {
  StockJsonSchema,
  StockSemanticRule,
} from "../../contracts/StockContract.types";
/** Strict authored data and exact cross-field invariants. */
export const inputSchema = z
  .strictObject({
    originalRows: z.array(z.string().min(1).max(18)).min(2).max(4),
    attempt: z.strictObject({
      rowIndex: z.number().int().min(0).max(3),
      replacement: z.string().max(18),
      outcome: z.enum(["failed", "completed"]),
    }),
    reload: z.strictObject({
      performed: z.boolean(),
      rows: z.array(z.string().max(18)).max(4),
    }),
    labels: z.strictObject({
      readable: z.string().min(1).max(34),
      invalid: z.string().min(1).max(34),
      blocked: z.string().min(1).max(34),
      reload: z.string().min(1).max(34),
    }),
    showAttempt: z.boolean(),
  })
  .superRefine((input, context) => {
    if (input.attempt.rowIndex >= input.originalRows.length) {
      context.addIssue({
        code: "custom",
        path: ["attempt", "rowIndex"],
        message: "Attempt row index must exist in originalRows.",
      });
    }
    if (
      input.reload.performed
        ? input.reload.rows.length < 2
        : input.reload.rows.length !== 0
    ) {
      context.addIssue({
        code: "custom",
        path: ["reload", "rows"],
        message:
          "Performed reload requires 2..4 complete rows. Unperformed reload requires no rows.",
      });
    }
  }) satisfies z.ZodType;
/** Schema-inferred complete authored input. */
export type Input = z.output<typeof inputSchema>;
/** Structural constraints for serializable editors. */
export const jsonSchema: StockJsonSchema = z.toJSONSchema(inputSchema);
/** Runtime-only rules not expressed by structural JSON Schema. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "existing-attempt-row",
    paths: ["attempt.rowIndex", "originalRows"],
    description:
      "rowIndex is an integer from 0 through originalRows.length - 1.",
  },
  {
    id: "complete-reload",
    paths: ["reload.performed", "reload.rows"],
    description:
      "A performed reload has 2..4 rows. Without a reload rows must be empty. Replacement and reload row strings accept empty values, without trimming.",
  },
];
