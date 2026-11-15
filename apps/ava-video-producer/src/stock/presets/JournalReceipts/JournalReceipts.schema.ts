import { prop } from "@avandar/utils";
import { z } from "zod";
import type { StockSemanticRule } from "../../contracts/StockContract.types";
/** Complete bounded authored inputs, with no partial defaults. */
export const inputSchema = z
  .strictObject({
    entries: z
      .array(
        z.strictObject({
          id: z.string().min(1).max(12),
          label: z.string().min(1).max(24),
        }),
      )
      .min(1)
      .max(5),
    receipts: z
      .array(
        z.strictObject({
          entryId: z.string().min(1).max(12),
          label: z.string().min(1).max(20),
        }),
      )
      .min(0)
      .max(5),
    copy: z.strictObject({
      journal: z.string().min(1).max(32),
      receiptPocket: z.string().min(1).max(32),
      disconnected: z.string().min(1).max(32),
      reconnected: z.string().min(1).max(32),
      pending: z.string().min(1).max(32),
      acknowledged: z.string().min(1).max(32),
      example: z.string().min(1).max(32),
    }),
    foldDirection: z.enum(["horizontal", "vertical"]),
    showIdentifiers: z.boolean(),
    showLabels: z.boolean(),
  })
  .superRefine((input, context) => {
    const identifiers = input.entries.map(prop("id"));
    if (new Set(identifiers).size !== identifiers.length) {
      context.addIssue({
        code: "custom",
        path: ["entries"],
        message: "Item identifiers must be unique.",
      });
    }
    const receiptIds = input.receipts.map(prop("entryId"));
    if (
      new Set(receiptIds).size !== receiptIds.length ||
      receiptIds.some((entryId) => !identifiers.includes(entryId)) ||
      input.receipts.length > input.entries.length
    ) {
      context.addIssue({
        code: "custom",
        path: ["receipts"],
        message: "Receipts must uniquely reference existing entries.",
      });
    }
  }) satisfies z.ZodType;
/** Schema-inferred authored content. */
export type Input = z.output<typeof inputSchema>;
/** Runtime relations supplement structural JSON Schema. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "unique-identifiers",
    paths: ["entries.*.id"],
    description: "Supplied item identifiers are unique.",
  },
  {
    id: "matching-receipts",
    paths: ["entries.*.id", "receipts.*.entryId"],
    description:
      "Every receipt references one existing entry, entryId is unique, and receipts.length never exceeds entries.length.",
  },
];
