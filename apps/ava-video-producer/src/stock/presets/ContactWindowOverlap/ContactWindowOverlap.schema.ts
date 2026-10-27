import { prop } from "@avandar/utils";
import { z } from "zod";
import type { StockSemanticRule } from "../../contracts/StockContract.types";
function _unique(items: ReadonlyArray<{ id: string }>): boolean {
  return new Set(items.map(prop("id"))).size === items.length;
}
/** Strict complete authored inputs and identity relationships. */
export const inputSchema = z
  .strictObject({
    records: z
      .array(
        z.strictObject({
          id: z.string().min(0).max(16),
          label: z.string().min(0).max(18),
          start: z.number().min(0).max(12).nullable(),
          end: z.number().min(0).max(12).nullable(),
        }),
      )
      .min(2)
      .max(6),
    investigationWindow: z.strictObject({
      start: z.number().min(0).max(12),
      end: z.number().min(0).max(12),
      label: z.string().min(1).max(28),
    }),
    axis: z.strictObject({
      start: z.number().min(0).max(0),
      end: z.number().int().min(2).max(12),
      unitLabel: z.string().min(1).max(24),
      venueLabel: z.string().min(1).max(24),
    }),
    sceneLabel: z.string().min(1).max(40),
    showOverlapFractions: z.boolean(),
    copy: z.strictObject({
      overlap: z.string().min(1).max(42),
      none: z.string().min(1).max(42),
      unknown: z.string().min(1).max(42),
      denominator: z.string().min(1).max(42),
      qualifier: z.string().min(1).max(42),
    }),
  })
  .superRefine((input, context) => {
    if (!_unique(input.records)) {
      context.addIssue({
        code: "custom",
        path: ["records"],
        message: "Each person ID must be unique.",
      });
    }
    if (
      !(input.investigationWindow.start < input.investigationWindow.end) ||
      input.investigationWindow.end > input.axis.end
    ) {
      context.addIssue({
        code: "custom",
        path: ["investigationWindow"],
        message: "The increasing window must lie within the axis.",
      });
    }
    input.records.forEach((record, index) => {
      const valid =
        (record.start === null && record.end === null) ||
        (record.start !== null &&
          record.end !== null &&
          record.start < record.end &&
          record.end <= input.axis.end);
      if (!valid) {
        context.addIssue({
          code: "custom",
          path: ["records", index],
          message:
            "Records have two unknown bounds or an increasing interval inside the axis.",
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
    paths: [
      "records",
      "investigationWindow",
      "investigationWindow.start",
      "investigationWindow.end",
      "records.*.start",
      "records.*.end",
      "axis.end",
    ],
    description:
      "Only actual interval intersections with the investigation window are highlighted; touching nonoverlapping intervals and unknown records do not become confirmed contacts. 2..6 records; unique IDs <= 16 and labels <= 18 characters; numeric bounds 0..12. investigationWindow.start < investigationWindow.end <= axis.end. Each record has both null bounds or start < end <= axis.end; one record per person.",
  },
];
