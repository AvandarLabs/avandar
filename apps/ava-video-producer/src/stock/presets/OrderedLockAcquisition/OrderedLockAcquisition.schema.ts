import { prop } from "@avandar/utils";
import { z } from "zod";
import type {
  StockJsonSchema,
  StockSemanticRule,
} from "../../contracts/StockContract.types";
/** Strict authored data and exact cross-field invariants. */
export const inputSchema = z
  .strictObject({
    resources: z
      .array(
        z.strictObject({
          id: z.string().min(1).max(10),
          label: z.string().min(1).max(20),
        }),
      )
      .length(2),
    operations: z
      .array(
        z.strictObject({
          id: z.string().min(1).max(12),
          label: z.string().min(1).max(24),
          requestedIds: z.array(z.string().min(1).max(10)).length(2),
        }),
      )
      .length(2),
    firstOperationId: z.string().min(1).max(12),
    showOriginalOrder: z.boolean(),
    copy: z.strictObject({
      context: z.string().min(1).max(38),
      before: z.string().min(1).max(38),
      after: z.string().min(1).max(38),
    }),
  })
  .superRefine((input, context) => {
    const resourceIds = new Set(input.resources.map(prop("id"))),
      operationIds = input.operations.map(prop("id"));
    if (resourceIds.size !== input.resources.length) {
      context.addIssue({
        code: "custom",
        path: ["resources"],
        message: "Resource IDs must be unique.",
      });
    }
    if (new Set(operationIds).size !== operationIds.length) {
      context.addIssue({
        code: "custom",
        path: ["operations"],
        message: "Operation IDs must be unique.",
      });
    }
    if (!operationIds.includes(input.firstOperationId)) {
      context.addIssue({
        code: "custom",
        path: ["firstOperationId"],
        message: "First operation must exist.",
      });
    }
    input.operations.forEach(({ requestedIds }, index) => {
      if (
        new Set(requestedIds).size !== 2 ||
        requestedIds.some((id) => !resourceIds.has(id))
      ) {
        context.addIssue({
          code: "custom",
          path: ["operations", index, "requestedIds"],
          message: "Requests must permute both resources.",
        });
      }
    });
    if (
      input.operations[0] &&
      input.operations[1] &&
      input.operations[0].requestedIds[0] !==
        input.operations[1].requestedIds[1]
    ) {
      context.addIssue({
        code: "custom",
        path: ["operations"],
        message: "Authored requests must have opposite orders.",
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
    id: "unique-resources",
    paths: ["resources.*.id"],
    description:
      "Exactly two unique resource IDs. Their array order defines canonical acquisition order, without alphabetic sorting.",
  },
  {
    id: "unique-operations",
    paths: ["operations.*.id"],
    description: "Exactly two unique operation IDs.",
  },
  {
    id: "opposite-permutations",
    paths: ["operations.*.requestedIds", "resources.*.id"],
    description:
      "Each request contains each resource exactly once. The two authored request orders are opposite.",
  },
  {
    id: "existing-first-operation",
    paths: ["firstOperationId", "operations.*.id"],
    description:
      "First operation references one of the two existing operations.",
  },
];
