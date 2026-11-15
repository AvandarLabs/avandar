import { prop } from "@avandar/utils";
import { z } from "zod";
import type { StockSemanticRule } from "../../contracts/StockContract.types";
/** Stable queue identities and an authored existing insertion reference. */
export const inputSchema = z
  .strictObject({
    queue: z
      .array(
        z.strictObject({
          id: z.string().max(16),
          label: z.string().min(1).max(16),
        }),
      )
      .min(3)
      .max(5),
    incomingItem: z.strictObject({
      id: z.string().max(16),
      label: z.string().min(1).max(18),
    }),
    insertBeforeId: z.string().max(16),
    priorityLabel: z.string().min(1).max(34),
    serviceLabel: z.string().min(1).max(22),
    showOriginalPositions: z.boolean(),
  })
  .superRefine((input, context) => {
    const identities = input.queue.map(prop("id"));
    if (
      new Set([...identities, input.incomingItem.id]).size !==
      input.queue.length + 1
    ) {
      context.addIssue({
        code: "custom",
        path: ["incomingItem", "id"],
        message: "Queue and incoming identities must be distinct.",
      });
    }
    if (!identities.includes(input.insertBeforeId)) {
      context.addIssue({
        code: "custom",
        path: ["insertBeforeId"],
        message: "Insertion must reference an existing queue item.",
      });
    }
  }) satisfies z.ZodType;
/** Exact validated queue input. */
export type Input = z.output<typeof inputSchema>;
/** Runtime cross-reference constraints. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "unique-identities",
    paths: ["queue.*.id", "incomingItem.id"],
    description:
      "All identities are distinct, permitting at most one empty identity.",
  },
  {
    id: "existing-insertion-reference",
    paths: ["insertBeforeId", "queue.*.id"],
    description:
      "insertBeforeId exactly matches an existing queue ID, including an empty ID.",
  },
  {
    id: "authored-priority-caption",
    paths: ["priorityLabel", "insertBeforeId"],
    description:
      "The author must ensure any named destination agrees with the insertion reference. Natural language agreement is not inferred.",
  },
];
