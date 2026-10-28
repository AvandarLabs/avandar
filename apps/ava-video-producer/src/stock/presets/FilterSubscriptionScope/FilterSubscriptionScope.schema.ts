import { propEq, prop } from "@avandar/utils";
import { z } from "zod";
import type { StockSemanticRule } from "../../contracts/StockContract.types";
const baseSchema = z.strictObject({
  records: z
    .array(
      z.strictObject({
        id: z.string().max(12),
        category: z.string().min(1).max(16),
        value: z.number().min(0).max(100),
      }),
    )
    .min(2)
    .max(6),
  views: z
    .array(
      z.strictObject({
        id: z.string().max(12),
        label: z.string().min(1).max(28),
        subscribed: z.boolean(),
      }),
    )
    .min(2)
    .max(3),
  selectedCategory: z.string().min(1).max(16),
  metric: z.strictObject({
    valueLabel: z.string().min(1).max(22),
    valueUnit: z.string().min(1).max(22),
    countUnit: z.string().min(1).max(22),
  }),
  showExcludedRecords: z.boolean(),
  copy: z.strictObject({
    context: z.string().min(1).max(34),
    source: z.string().min(1).max(34),
    result: z.string().min(1).max(34),
  }),
}) satisfies z.ZodType;
/** Complete equality selection with explicit subscription membership. */
export const inputSchema = baseSchema.superRefine((input, context) => {
  if (
    new Set(input.records.map(prop("id"))).size !== input.records.length ||
    new Set(input.views.map(prop("id"))).size !== input.views.length
  ) {
    context.addIssue({
      code: "custom",
      path: ["records"],
      message: "Record and view IDs must each be unique.",
    });
  }
  if (!input.records.some(propEq("category", input.selectedCategory))) {
    context.addIssue({
      code: "custom",
      path: ["selectedCategory"],
      message: "Selected category must exactly match a source category.",
    });
  }
  if (
    !input.views.some(prop("subscribed")) ||
    !input.views.some((view) => !view.subscribed)
  ) {
    context.addIssue({
      code: "custom",
      path: ["views"],
      message: "Require a subscribed and an unsubscribed view.",
    });
  }
}) satisfies z.ZodType;
/** Complete strict schema output. */
export type Input = z.output<typeof inputSchema>;
/** Runtime cross-field constraints beyond structural JSON Schema. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "unique-identities",
    paths: ["records.*.id", "views.*.id"],
    description:
      "Record IDs and view IDs are each unique, including at most one empty ID in each set.",
  },
  {
    id: "category-membership",
    paths: ["selectedCategory", "records.*.category"],
    description:
      "Selected category exactly equals at least one source category, preserving whitespace.",
  },
  {
    id: "mixed-subscriptions",
    paths: ["views.*.subscribed"],
    description:
      "At least one view is subscribed and at least one is unsubscribed. Every view derives both sum and row count from its applicable original records.",
  },
];
