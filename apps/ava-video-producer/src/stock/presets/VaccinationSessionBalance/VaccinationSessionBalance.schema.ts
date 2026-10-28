import { propEq, prop } from "@avandar/utils";
import { z } from "zod";
import type { StockSemanticRule } from "../../contracts/StockContract.types";
function _unique(items: ReadonlyArray<{ id: string }>): boolean {
  return new Set(items.map(prop("id"))).size === items.length;
}
/** Strict complete authored inputs and identity relationships. */
export const inputSchema = z
  .strictObject({
    units: z
      .array(
        z.strictObject({
          id: z.string().min(0).max(16),
          outcome: z.enum(["administered", "remaining", "discarded"]),
          recipientId: z.string().min(1).max(16).nullable(),
        }),
      )
      .min(1)
      .max(12),
    recipients: z
      .array(
        z.strictObject({
          id: z.string().min(0).max(16),
          label: z.string().min(0).max(18),
        }),
      )
      .min(0)
      .max(6),
    sceneLabel: z.string().min(1).max(40),
    showPeopleTotal: z.boolean(),
    showEquation: z.boolean(),
    copy: z.strictObject({
      opening: z.string().min(1).max(42),
      administered: z.string().min(1).max(42),
      remaining: z.string().min(1).max(42),
      discarded: z.string().min(1).max(42),
      people: z.string().min(1).max(42),
      unit: z.string().min(1).max(42),
    }),
  })
  .superRefine((input, context) => {
    const recipientIds = new Set(
      input.units
        .filter(propEq("outcome", "administered"))
        .map(prop("recipientId")),
    );
    if (
      !_unique(input.units) ||
      !_unique(input.recipients) ||
      recipientIds.size !== input.recipients.length ||
      input.recipients.some((recipient) => !recipientIds.has(recipient.id))
    ) {
      context.addIssue({
        code: "custom",
        message:
          "Unique recipient IDs must exactly match administered recipients.",
      });
    }
    input.units.forEach((unit, index) => {
      if ((unit.outcome === "administered") !== (unit.recipientId !== null)) {
        context.addIssue({
          code: "custom",
          path: ["units", index, "recipientId"],
          message: "Only administered units require a recipient.",
        });
      }
    });
  }) satisfies z.ZodType;
/** Accepted input, inferred without widening the schema output. */
export type Input = z.output<typeof inputSchema>;
/** Cross-field rules requiring runtime validation. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "unique-identities-and-authored-relations",
    paths: ["units", "recipients"],
    description:
      "Used, remaining and lost dose tokens sum exactly to starting units; people counts remain distinct from doses and no person appears for an unused dose. Reject administered units without a recipient ID and non-administered units with a recipient ID. 1..12 units; unique IDs <= 16 characters; every administered unit requires a nonempty recipientId <= 16 characters; all other outcomes require recipientId null; at most 6 unique recipients. 0..6 recipients; unique IDs <= 16 characters; labels <= 18 characters; IDs must equal exactly the set of recipientId values used by units.",
  },
];
