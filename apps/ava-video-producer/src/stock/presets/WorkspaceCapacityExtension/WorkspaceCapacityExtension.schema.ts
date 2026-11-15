import { prop } from "@avandar/utils";
import { z } from "zod";
import type { StockSemanticRule } from "../../contracts/StockContract.types";
/** Complete authored input structure. */
export const inputSchema = z
  .strictObject({
    existingResources: z
      .array(
        z.strictObject({
          id: z.string().min(1).max(16),
          label: z.string().min(1).max(20),
        }),
      )
      .min(1)
      .max(6),
    requestedResources: z
      .array(
        z.strictObject({
          id: z.string().min(1).max(16),
          label: z.string().min(1).max(20),
        }),
      )
      .min(1)
      .max(3),
    allowances: z.strictObject({
      currentAllowance: z.strictObject({
        label: z.string().min(1).max(28),
        limit: z.number().int().min(1).max(9),
      }),
      expandedAllowance: z.strictObject({
        label: z.string().min(1).max(28),
        limit: z.number().int().min(1).max(9),
      }),
    }),
    choice: z.strictObject({
      decision: z.union([z.literal("expand"), z.literal("keep")]),
      label: z.string().min(1).max(36),
    }),
    copy: z.strictObject({
      workspace: z.string().min(1).max(42),
      pending: z.string().min(1).max(42),
      capacity: z.string().min(1).max(42),
      retained: z.string().min(1).max(42),
      example: z.string().min(1).max(42),
    }),
    showResourceLabels: z.boolean(),
  })
  .superRefine((input, context) => {
    if (
      new Set(
        [...input.existingResources, ...input.requestedResources].map(
          prop("id"),
        ),
      ).size !==
      input.existingResources.length + input.requestedResources.length
    ) {
      context.addIssue({
        code: "custom",
        path: ["existingResources"],
        message: "Resource IDs are unique across both collections.",
      });
    }
    if (
      input.allowances.expandedAllowance.limit <=
      input.allowances.currentAllowance.limit
    ) {
      context.addIssue({
        code: "custom",
        path: ["allowances"],
        message:
          "Expanded allowance is strictly greater than current allowance. Both limits are integers 1..9.",
      });
    }
    if (
      input.existingResources.length >
        input.allowances.currentAllowance.limit ||
      input.existingResources.length + input.requestedResources.length <=
        input.allowances.currentAllowance.limit ||
      input.existingResources.length + input.requestedResources.length >
        input.allowances.expandedAllowance.limit
    ) {
      context.addIssue({
        code: "custom",
        path: ["existingResources"],
        message:
          "Existing length is at most current limit. Combined length exceeds current limit and is at most expanded limit, for both choices.",
      });
    }
  }) satisfies z.ZodType;
/** Accepted output inferred from runtime validation. */
export type Input = z.output<typeof inputSchema>;
/** Runtime cross-field rules and scene eligibility beyond JSON Schema. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "resource-identity",
    paths: ["existingResources.*.id", "requestedResources.*.id"],
    description: "Resource IDs are unique across both collections.",
  },
  {
    id: "ordered-allowances",
    paths: [
      "allowances.currentAllowance.limit",
      "allowances.expandedAllowance.limit",
    ],
    description:
      "Expanded allowance is strictly greater than current allowance. Both limits are integers 1..9.",
  },
  {
    id: "capacity-conservation",
    paths: ["existingResources", "requestedResources", "allowances"],
    description:
      "Existing length is at most current limit. Combined length exceeds current limit and is at most expanded limit, for both choices.",
  },
];
