import { prop } from "@avandar/utils";
import { z } from "zod";
import type { StockSemanticRule } from "../../contracts/StockContract.types";

const baseSchema = z.strictObject({
  zones: z
    .array(
      z.strictObject({
        id: z.string().max(12),
        label: z.string().max(16),
        value: z.number().min(0).max(100).nullable(),
      }),
    )
    .min(3)
    .max(6),
  schemes: z
    .array(
      z.strictObject({
        label: z.string().min(1).max(28),
        breaks: z.array(z.number()).length(3),
      }),
    )
    .length(2),
  unitLabel: z.string().min(1).max(20),
  noDataLabel: z.string().min(1).max(26),
  showValueRuler: z.boolean(),
  copy: z.strictObject({
    context: z.string().min(1).max(40),
    before: z.string().min(1).max(40),
    after: z.string().min(1).max(40),
  }),
}) satisfies z.ZodType;
/** Two authored finite scales cover the same fixed zone values. */
export const inputSchema = baseSchema.superRefine((input, context) => {
  if (new Set(input.zones.map(prop("id"))).size !== input.zones.length) {
    context.addIssue({
      code: "custom",
      path: ["zones"],
      message: "Zone IDs must be unique.",
    });
  }
  input.schemes.forEach((scheme, index) => {
    const [lower, middle, upper] = scheme.breaks;
    if (
      !(lower < middle && middle < upper) ||
      input.zones.some(
        (zone) =>
          zone.value !== null && (zone.value < lower || zone.value > upper),
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["schemes", index, "breaks"],
        message:
          "Three increasing finite breaks must cover every non-null value.",
      });
    }
  });
  const [first, second] = input.schemes;
  if (
    first &&
    second &&
    (first.breaks[0] !== second.breaks[0] ||
      first.breaks[2] !== second.breaks[2])
  ) {
    context.addIssue({
      code: "custom",
      path: ["schemes"],
      message: "Schemes must share exact minimum and maximum.",
    });
  }
}) satisfies z.ZodType;
/** Complete strict schema output. */
export type Input = z.output<typeof inputSchema>;
/** Runtime cross-field constraints beyond structural JSON Schema. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "unique-zones",
    paths: ["zones.*.id"],
    description: "Zone IDs are unique, including at most one empty ID.",
  },
  {
    id: "classification-domain",
    paths: ["schemes.*.breaks", "zones.*.value"],
    description:
      "Exactly three strictly increasing finite breaks per scheme. Both schemes share exact lower and upper endpoints and contain every non-null zone value. Intervals are [lower,upper), with the final maximum inclusive. Null always remains a distinct missing class.",
  },
];
