import { prop } from "@avandar/utils";
import { z } from "zod";
import type { StockSemanticRule } from "../../contracts/StockContract.types";

function _unique(items: ReadonlyArray<{ id: string }>): boolean {
  return new Set(items.map(prop("id"))).size === items.length;
}
/** Strict complete authored input and cross-field domain rules. */
export const inputSchema = z
  .strictObject({
    periods: z
      .array(
        z.strictObject({
          id: z.string().min(1).max(16),
          label: z.string().min(1).max(24),
          receiptsMinor: z.number().int().min(1).max(1000000),
          operatingOutflowMinor: z.number().int().min(0).max(1000000),
          distributionActive: z.boolean(),
        }),
      )
      .min(2)
      .max(2),
    arrangement: z.strictObject({
      label: z.string().min(1).max(30),
      rateBasisPoints: z.number().int().min(1).max(10000),
      termBoundaryLabel: z.string().min(1).max(30),
    }),
    money: z.strictObject({
      unitLabel: z.string().min(1).max(18),
      minorUnitsPerUnit: z.union([z.literal(1), z.literal(100)]),
    }),
    copy: z.strictObject({
      receipts: z.string().min(1).max(28),
      operating: z.string().min(1).max(28),
      distribution: z.string().min(1).max(28),
      retained: z.string().min(1).max(28),
      example: z.string().min(1).max(60),
    }),
    showAmounts: z.boolean(),
    arrangementLayout: z.enum(["side-by-side", "stacked"]),
  })
  .superRefine((input, context) => {
    const [first, second] = input.periods;
    if (!first || !second) {
      return;
    }
    const product = first.receiptsMinor * input.arrangement.rateBasisPoints;
    if (
      !_unique(input.periods) ||
      !first.distributionActive ||
      second.distributionActive ||
      first.receiptsMinor !== second.receiptsMinor ||
      first.operatingOutflowMinor !== second.operatingOutflowMinor ||
      product % 10000 !== 0 ||
      product / 10000 + first.operatingOutflowMinor > first.receiptsMinor
    ) {
      context.addIssue({
        code: "custom",
        message:
          "Equal independent flows require exact active distribution, nonnegative remainder and an ended second term.",
        path: ["periods"],
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
      "periods",
      "arrangement",
      "money",
      "copy",
      "showAmounts",
      "arrangementLayout",
    ],
    description:
      "Exactly 2 items; unique IDs 1..16 characters; labels 1..24 characters; first distributionActive true and second false; receiptsMinor positive integer <= 1000000 and identical between periods; operatingOutflowMinor integer 0..receiptsMinor and identical between periods; no stock balance is carried between periods label 1..30 characters; termBoundaryLabel 1..30 characters; rateBasisPoints integer 1..10000; receiptsMinor * rateBasisPoints divisible by 10000; distributionMinor + operatingOutflowMinor <= receiptsMinor; no floating-point rounding or external terms unitLabel 1..18 characters; minorUnitsPerUnit exactly 1 or 100; all quantities use the same unit and both periods have the same duration All keys required; accounting labels 1..28 characters; example 1..60 characters; do not relabel retained as profit, net worth, working capital, or cash on hand boolean; labels, common monetary unit, term marker, and reconciliation geometry stay visible side-by-side or stacked; layout changes neither arithmetic nor equal-period meaning Free prose meaning is an author responsibility, not a language classifier.",
  },
];
