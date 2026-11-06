import { prop } from "@avandar/utils";
import { z } from "zod";
import type {
  StockJsonSchema,
  StockSemanticRule,
} from "../../contracts/StockContract.types";
/** Strict authored data and exact cross-field invariants. */
export const inputSchema = z
  .strictObject({
    observations: z
      .array(
        z.strictObject({
          id: z.string().min(1).max(12),
          value: z.number().min(-100).max(100).nullable(),
        }),
      )
      .min(2)
      .max(6),
    rule: z.enum([
      "first",
      "most-frequent",
      "sum",
      "mean",
      "min",
      "max",
      "count",
    ]),
    nullPolicy: z.enum(["include-in-mode", "exclude-from-mode"]),
    labels: z.strictObject({
      entity: z.string().min(1).max(26),
      field: z.string().min(1).max(26),
      unit: z.string().min(1).max(26),
      countUnit: z.string().min(1).max(26),
      missing: z.string().min(1).max(26),
      result: z.string().min(1).max(26),
    }),
    showCalculation: z.boolean(),
  })
  .superRefine((input, context) => {
    const ids = input.observations.map(prop("id"));
    if (new Set(ids).size !== ids.length) {
      context.addIssue({
        code: "custom",
        path: ["observations"],
        message: "Observation IDs must be unique.",
      });
    }
    if (input.observations.every(({ value }) => value === null)) {
      context.addIssue({
        code: "custom",
        path: ["observations"],
        message: "At least one observation must be numeric.",
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
    id: "unique-observations",
    paths: ["observations.*.id"],
    description: "The 2..6 observation IDs are unique.",
  },
  {
    id: "non-null-contribution",
    paths: ["observations.*.value"],
    description:
      "At least one value is non-null. Numeric values are finite within -100..100. First preserves an initial null. Numeric aggregates and count skip null. Mode uses the selected null policy, with ties ascending numerically and then null. Mean retains sum/count internally and displays at most two decimals with an approximation mark when rounded.",
  },
];
