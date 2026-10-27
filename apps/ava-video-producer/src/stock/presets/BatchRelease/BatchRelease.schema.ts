import { prop } from "@avandar/utils";
import { z } from "zod";
import type {
  StockJsonSchema,
  StockSemanticRule,
} from "../../contracts/StockContract.types";
/** Strict complete input preserves accepted bounds and identities. */
export const inputSchema = z
  .strictObject({
    batches: z
      .array(
        z.strictObject({
          id: z.string().max(16),
          label: z.string().max(18),
          items: z
            .array(
              z.strictObject({
                id: z.string().max(16),
                label: z.string().max(12),
              }),
            )
            .min(2)
            .max(3),
        }),
      )
      .min(1)
      .max(2),
    intakeLabel: z.string().min(1).max(24),
    boundaryLabel: z.string().min(1).max(20),
    destinationLabel: z.string().min(1).max(26),
    releaseLabel: z.string().min(1).max(26),
    showItemLabels: z.boolean(),
  })
  .superRefine((input, context) => {
    const ids = input.batches.flatMap((batch) => [
      batch.id,
      ...batch.items.map(prop("id")),
    ]);
    if (new Set(ids).size !== ids.length) {
      context.addIssue({
        code: "custom",
        path: ["batches"],
        message: "Batch and item IDs must be globally unique.",
      });
    }
  }) satisfies z.ZodType;
/** Input inferred from strict runtime validation. */
export type Input = z.output<typeof inputSchema>;
/** Structural schema. Semantic rules are enforced by runtime validation. */
export const jsonSchema: StockJsonSchema = z.toJSONSchema(inputSchema);
/** Cross-field invariants beyond structural validation. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "exact-membership",
    paths: ["batches.*.id", "batches.*.items.*.id"],
    description:
      "All batch and item IDs are globally unique. Every supplied group has exactly two or three members and groups never combine.",
  },
];
