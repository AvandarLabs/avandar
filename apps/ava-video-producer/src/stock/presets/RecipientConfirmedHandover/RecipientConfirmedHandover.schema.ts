import { prop } from "@avandar/utils";
import { z } from "zod";
import type { StockSemanticRule } from "../../contracts/StockContract.types";
/** Complete strict authored input and semantic constraints. */
export const inputSchema = z
  .strictObject({
    contents: z
      .array(
        z.strictObject({
          id: z.string().min(0).max(24),
          label: z.string().min(0).max(26),
          symbol: z.enum(["grain", "blanket", "soap", "container"]),
          offeredUnits: z.number().finite().int().min(1).max(4),
          selectedUnits: z.number().finite().int().min(0).max(4),
        }),
      )
      .min(1)
      .max(4),
    participantLabels: z.strictObject({
      recipient: z.string().min(1).max(28),
      deliveryTeam: z.string().min(1).max(28),
    }),
    receiptLabels: z.strictObject({
      heading: z.string().min(0).max(28),
      acknowledgement: z.string().min(0).max(28),
      recipientCopy: z.string().min(0).max(28),
      teamCopy: z.string().min(0).max(28),
      offered: z.string().min(0).max(28),
      selected: z.string().min(0).max(28),
      retained: z.string().min(0).max(28),
    }),
    acknowledgementMark: z.enum(["tick", "initials"]),
    initialsText: z.string().regex(/^[A-Z]{1,3}$/),
    showQuantityList: z.boolean(),
    scenarioCaption: z.string().min(1).max(48),
  })
  .superRefine((input, context) => {
    const issue = (path: string, message: string) =>
      context.addIssue({ code: "custom", path: [path], message });

    if (
      new Set(input.contents.map(prop("id"))).size !== input.contents.length
    ) {
      issue("contents", "Content IDs must be unique.");
    }
    const offered = input.contents.reduce(
      (sum, item) => sum + item.offeredUnits,
      0,
    );
    const selected = input.contents.reduce(
      (sum, item) => sum + item.selectedUnits,
      0,
    );
    if (
      input.contents.some((item) => item.selectedUnits > item.offeredUnits) ||
      offered < 2 ||
      offered > 10 ||
      selected < 1 ||
      selected > 5 ||
      selected >= offered
    ) {
      issue(
        "contents",
        "Selected must not exceed offered per line; total offered 2..10, total selected 1..5, and at least one retained unit.",
      );
    }
  }) satisfies z.ZodType;
/** Input inferred from runtime validation. */
export type Input = z.output<typeof inputSchema>;
/** Runtime cross-field constraints and conserved quantities. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "recipient-confirmed-handover.0",
    paths: ["contents.*.id"],
    description: "Content IDs must be unique, including at most one empty ID.",
  },
  {
    id: "recipient-confirmed-handover.1",
    paths: ["contents.*.offeredUnits", "contents.*.selectedUnits"],
    description:
      "For every content line selectedUnits <= offeredUnits. Sum offered is 2..10, sum selected is 1..5, and sum selected < sum offered. Every offered unit remains either on the delivery table, on the counting mat, or in the basket.",
  },
  {
    id: "recipient-confirmed-handover.2",
    paths: [
      "contents",
      "showQuantityList",
      "acknowledgementMark",
      "initialsText",
    ],
    description:
      "Receipt quantities always equal actually moved selected quantities, even with showQuantityList false. Tick or configured initials acknowledge only that list and never alter quantities.",
  },
];
