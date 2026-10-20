import { prop } from "@avandar/utils";
import { z } from "zod";
import type { StockSemanticRule } from "../../contracts/StockContract.types";
function _unique(items: ReadonlyArray<{ id: string }>): boolean {
  return new Set(items.map(prop("id"))).size === items.length;
}
/** Strict complete authored inputs and identity relationships. */
export const inputSchema = z
  .strictObject({
    cases: z
      .array(
        z.strictObject({
          id: z.string().min(0).max(16),
          label: z.string().min(0).max(18),
          channel: z.enum(["phone", "doorstep"]),
          attempts: z.number().int().min(1).max(3),
          outcome: z.enum(["unreached", "contacted", "booked", "attended"]),
        }),
      )
      .min(1)
      .max(6),
    places: z.strictObject({
      homeLabel: z.string().min(1).max(24),
      clinicLabel: z.string().min(1).max(24),
      calendarLabel: z.string().min(1).max(24),
    }),
    sceneLabel: z.string().min(1).max(40),
    showAttemptCount: z.boolean(),
    showOutcomeLedger: z.boolean(),
    copy: z.strictObject({
      group: z.string().min(1).max(42),
      attempts: z.string().min(1).max(42),
      unreached: z.string().min(1).max(42),
      contacted: z.string().min(1).max(42),
      booked: z.string().min(1).max(42),
      attended: z.string().min(1).max(42),
    }),
  })
  .superRefine((input, context) => {
    if (!_unique(input.cases)) {
      context.addIssue({
        code: "custom",
        path: ["cases"],
        message: "Each case ID must be unique.",
      });
    }
  }) satisfies z.ZodType;
/** Accepted input, inferred without widening the schema output. */
export type Input = z.output<typeof inputSchema>;
/** Cross-field rules requiring runtime validation. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "unique-identities-and-authored-relations",
    paths: ["cases", "places"],
    description:
      "Contact and booking do not move a person through the clinic door; only the authored attended outcome does, and all original cases retain a final state. 1..6 cases; unique IDs <= 16 characters; labels <= 18 characters; attempts integer 1..3; enum values only; one outcome per person.",
  },
];
