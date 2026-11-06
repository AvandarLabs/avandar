import { prop } from "@avandar/utils";
import { z } from "zod";
import type {
  StockJsonSchema,
  StockSemanticRule,
} from "../../contracts/StockContract.types";
/** Strict authored data and exact cross-field invariants. */
export const inputSchema = z
  .strictObject({
    entities: z
      .array(
        z.strictObject({
          id: z.string().min(1).max(10),
          label: z.string().min(1).max(20),
        }),
      )
      .min(2)
      .max(4),
    observations: z
      .array(
        z.strictObject({
          id: z.string().max(12),
          entityId: z.string().min(1).max(10),
          value: z.number().min(0).max(100),
        }),
      )
      .min(1)
      .max(7),
    field: z.strictObject({
      label: z.string().min(1).max(24),
      unit: z.string().min(1).max(24),
      missingLabel: z.string().min(1).max(24),
    }),
    showSourceRows: z.boolean(),
    copy: z.strictObject({
      context: z.string().min(1).max(38),
      before: z.string().min(1).max(38),
      after: z.string().min(1).max(38),
    }),
  })
  .superRefine((input, context) => {
    const entityIds = new Set(input.entities.map(prop("id"))),
      observationIds = input.observations.map(prop("id"));
    if (entityIds.size !== input.entities.length) {
      context.addIssue({
        code: "custom",
        path: ["entities"],
        message: "Entity IDs must be unique.",
      });
    }
    if (new Set(observationIds).size !== observationIds.length) {
      context.addIssue({
        code: "custom",
        path: ["observations"],
        message: "Observation IDs must be unique, including an empty ID.",
      });
    }
    input.observations.forEach(({ entityId }, index) => {
      if (!entityIds.has(entityId)) {
        context.addIssue({
          code: "custom",
          path: ["observations", index, "entityId"],
          message: "Observation must reference an existing entity.",
        });
      }
    });
  }) satisfies z.ZodType;
/** Schema-inferred complete authored input. */
export type Input = z.output<typeof inputSchema>;
/** Structural constraints for serializable editors. */
export const jsonSchema: StockJsonSchema = z.toJSONSchema(inputSchema);
/** Runtime-only rules not expressed by structural JSON Schema. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "unique-entity-spine",
    paths: ["entities.*.id"],
    description: "The 2..4 entity IDs are unique.",
  },
  {
    id: "unique-observations",
    paths: ["observations.*.id"],
    description:
      "The 1..7 observation IDs are unique. IDs have an upper bound of 12 characters and accept an empty ID without trimming.",
  },
  {
    id: "existing-entity",
    paths: ["observations.*.entityId", "entities.*.id"],
    description:
      "Every observation references an existing entity. Matching is exact, including whitespace and Unicode. Missing observations yield null, while zero observations sum to zero.",
  },
];
