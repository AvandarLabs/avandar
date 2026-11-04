import { prop } from "@avandar/utils";
import { z } from "zod";
import type {
  StockJsonSchema,
  StockSemanticRule,
} from "../../contracts/StockContract.types";
/** Strict complete input preserves accepted bounds and identities. */
export const inputSchema = z
  .strictObject({
    tasks: z
      .array(
        z.strictObject({
          id: z.string().max(16),
          label: z.string().min(1).max(16),
          duration: z.number().int().min(1).max(4),
        }),
      )
      .min(2)
      .max(4),
    reserveUnits: z.number().int().min(1).max(4),
    interruption: z.strictObject({
      label: z.string().min(1).max(18),
      afterTaskId: z.string().max(16),
      duration: z.number().int().min(1).max(4),
    }),
    scheduleLabels: z.strictObject({
      reserve: z.string().min(1).max(20),
      deadline: z.string().min(1).max(20),
    }),
    unitLabel: z.string().min(1).max(12),
    showValues: z.boolean(),
    resultLabel: z.string().min(1).max(38),
  })
  .superRefine((input, context) => {
    if (
      new Set(input.tasks.map(prop("id"))).size !== input.tasks.length ||
      !input.tasks
        .slice(0, -1)
        .some(({ id }) => id === input.interruption.afterTaskId) ||
      input.interruption.duration > input.reserveUnits
    ) {
      context.addIssue({
        code: "custom",
        path: ["interruption"],
        message:
          "A bounded interruption follows an identified nonfinal task without exceeding reserve.",
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
    id: "conserved-schedule",
    paths: [
      "tasks.*.id",
      "interruption.afterTaskId",
      "interruption.duration",
      "reserveUnits",
    ],
    description:
      "Task IDs are unique. Insert after a nonfinal task. The interruption cannot exceed reserve, including exact exhaustion to zero remaining reserve.",
  },
];
