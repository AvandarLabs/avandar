import { prop, propEq, propNotEq } from "@avandar/utils";
import { z } from "zod";
import type { StockSemanticRule } from "../../contracts/StockContract.types";
function _unique(items: ReadonlyArray<{ id: string }>): boolean {
  return new Set(items.map(prop("id"))).size === items.length;
}
/** Strict complete authored input and cross-field domain rules. */
export const inputSchema = z
  .strictObject({
    slots: z
      .array(
        z.strictObject({
          id: z.string().min(1).max(20),
          label: z.string().min(1).max(22),
          kind: z.enum(["work", "rest", "learning", "community"]),
          workLabel: z.string().min(1).max(22).nullable(),
        }),
      )
      .min(3)
      .max(8),
    request: z.strictObject({
      label: z.string().min(1).max(24),
      requestedSlotId: z.string(),
      placement: z.enum(["defer", "reschedule"]),
      agreedSlotId: z.string().nullable(),
    }),
    workerLabel: z.string().min(1).max(24),
    labels: z.strictObject({
      work: z.string().min(1).max(32),
      rest: z.string().min(1).max(32),
      learning: z.string().min(1).max(32),
      community: z.string().min(1).max(32),
      protected: z.string().min(1).max(32),
      deferred: z.string().min(1).max(32),
      rescheduled: z.string().min(1).max(32),
      unit: z.string().min(1).max(32),
      example: z.string().min(1).max(32),
    }),
    showSlotLabels: z.boolean(),
    protectedPattern: z.enum(["hatch", "dots"]),
  })
  .superRefine((input, context) => {
    if (
      !_unique(input.slots) ||
      !input.slots.some(propEq("kind", "work")) ||
      !input.slots.some(propNotEq("kind", "work")) ||
      input.slots.some(
        (slot) => slot.kind !== "work" && slot.workLabel !== null,
      )
    ) {
      context.addIssue({
        code: "custom",
        message:
          "Unique slots include work and protected time; protected slots cannot contain work.",
        path: ["slots"],
      });
    }
    const requested = input.slots.find(
      propEq("id", input.request.requestedSlotId),
    );
    const agreed = input.slots.find(
      propEq<{ id: unknown }, "id", unknown>("id", input.request.agreedSlotId),
    );
    if (
      !requested ||
      requested.kind === "work" ||
      (input.request.placement === "defer"
        ? input.request.agreedSlotId !== null
        : !agreed || agreed.kind !== "work" || agreed.workLabel !== null)
    ) {
      context.addIssue({
        code: "custom",
        message:
          "Request must target protected time; defer stays outstanding and reschedule selects an empty work slot.",
        path: ["request"],
      });
    }
  }) satisfies z.ZodType;
/** Accepted input inferred from the schema. */
export type Input = z.output<typeof inputSchema>;
/** Runtime cross-field constraints beyond structural JSON Schema. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "authored-domain",
    paths: [
      "slots",
      "request",
      "workerLabel",
      "labels",
      "showSlotLabels",
      "protectedPattern",
    ],
    description:
      "3..8 slots; unique IDs 1..20 characters; labels and non-null workLabel 1..22 characters; at least one work and one non-work slot; non-work slots require workLabel null; each slot is one equal unit, with no implied hours or workweek policy. Label 1..24 characters; requestedSlotId refers to a non-work slot; defer requires agreedSlotId null; reschedule requires an existing work slot with workLabel null; no other slot may change. 1..24 characters. Each value 1..32 characters; no label may imply that deferred work is complete. Boolean; commitments and protected kinds remain visible. Presentation only; all non-work slots retain this cue. Free prose meaning is an author responsibility, not a language classifier.",
  },
];
