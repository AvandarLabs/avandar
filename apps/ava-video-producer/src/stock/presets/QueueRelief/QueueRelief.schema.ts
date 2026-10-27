import { prop } from "@avandar/utils";
import { z } from "zod";
import type { StockSemanticRule } from "../../contracts/StockContract.types";
/** Complete authored document with exact collection and reference bounds. */
export const inputSchema = z
  .strictObject({
    items: z
      .array(
        z.strictObject({
          id: z.string().min(0).max(16),
          label: z.string().min(0).max(14),
        }),
      )
      .min(3)
      .max(8),
    serviceSlots: z
      .array(
        z.strictObject({
          id: z.string().min(0).max(16),
          label: z.string().min(0).max(18),
          initiallyOpen: z.boolean(),
        }),
      )
      .min(2)
      .max(4),
    queueLabel: z.string().min(1).max(24),
    completionLabel: z.string().min(1).max(24),
    capacityChangeLabel: z.string().min(1).max(36),
    showItemLabels: z.boolean(),
  })
  .superRefine((input, context) => {
    ["items", "serviceSlots"].forEach((collection) => {
      const items = input[collection as "items" | "serviceSlots"];
      if (
        new Set(items.map(prop<{ id: string }, "id", string>("id"))).size !==
        items.length
      ) {
        context.addIssue({
          code: "custom",
          path: [collection],
          message: "IDs must be unique within each collection.",
        });
      }
    });
    const numOpen = input.serviceSlots.filter(prop("initiallyOpen")).length;
    if (numOpen === 0 || numOpen === input.serviceSlots.length) {
      context.addIssue({
        code: "custom",
        path: ["serviceSlots"],
        message: "At least one open and one closed slot are required.",
      });
    }
    if (input.items.length <= numOpen) {
      context.addIssue({
        code: "custom",
        path: ["items"],
        message: "Items must exceed initially open slots to create a backlog.",
      });
    }
  }) satisfies z.ZodType;
/** Input inferred from the strict runtime schema. */
export type Input = z.output<typeof inputSchema>;
/** Cross-reference constraints beyond structural JSON Schema. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "unique-identities",
    paths: ["items.*.id", "serviceSlots.*.id"],
    description: "IDs are unique within each collection.",
  },
  {
    id: "capacity-expansion",
    paths: ["serviceSlots.*.initiallyOpen"],
    description:
      "At least one initially open and one initially closed bay are required.",
  },
  {
    id: "initial-backlog",
    paths: ["items", "serviceSlots"],
    description: "The item count must exceed the initial open bay count.",
  },
];
