import { prop } from "@avandar/utils";
import { z } from "zod";
import type { StockSemanticRule } from "../../contracts/StockContract.types";
/** Complete authored input structure. */
/** Structural input before authored cross-field validation. */
const baseInputSchema = z.strictObject({
  groups: z
    .array(
      z.strictObject({
        id: z.string().min(1).max(16),
        label: z.string().min(1).max(24),
        items: z
          .array(
            z.strictObject({
              id: z.string().min(1).max(16),
              label: z.string().min(1).max(16),
              bytes: z.number().int().min(0).max(10000000),
            }),
          )
          .min(1)
          .max(3),
      }),
    )
    .min(2)
    .max(2),
  itemKind: z.union([z.literal("datasets"), z.literal("rows")]),
  measure: z.strictObject({
    displayUnit: z.union([z.literal("B"), z.literal("KiB"), z.literal("MiB")]),
    basisLabel: z.string().min(1).max(36),
    scaleMaximumBytes: z.number().int().min(1).max(60000000),
  }),
  copy: z.strictObject({
    count: z.string().min(1).max(24),
    size: z.string().min(1).max(24),
    total: z.string().min(1).max(24),
    proxyNote: z.string().min(1).max(52),
    example: z.string().min(1).max(52),
  }),
  showItemSizes: z.boolean(),
  showCountGuides: z.boolean(),
});

/** Validates equal-length item groups with unequal byte totals. */
export const inputSchema = baseInputSchema.superRefine((input, context) => {
  if (new Set(input.groups.map(prop("id"))).size !== input.groups.length) {
    context.addIssue({
      code: "custom",
      path: ["groups"],
      message: "Exactly two groups have unique IDs.",
    });
  }
  _validateGlobalItemIdentity({ input, context });
  if (
    input.groups.length === 2 &&
    input.groups[0].items.length !== input.groups[1].items.length
  ) {
    context.addIssue({
      code: "custom",
      path: ["groups"],
      message:
        "Both groups have equal collection length, 1..3 items each, including zero-byte items.",
    });
  }
  _validateUnequalByteTotals({ input, context });
  if (
    input.groups.some((group) => {
      return (
        group.items.reduce((sum, item) => {
          return sum + item.bytes;
        }, 0) > input.measure.scaleMaximumBytes
      );
    })
  ) {
    context.addIssue({
      code: "custom",
      path: ["groups"],
      message:
        "The common positive integer scale is at most 60000000 and at least each group byte total.",
    });
  }
}) satisfies z.ZodType;
/** Accepted output inferred from runtime validation. */
export type Input = z.output<typeof inputSchema>;
/** Runtime cross-field rules and scene eligibility beyond JSON Schema. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "group-identity",
    paths: ["groups.*.id"],
    description: "Exactly two groups have unique IDs.",
  },
  {
    id: "item-identity",
    paths: ["groups.*.items.*.id"],
    description: "Item IDs are globally unique across both groups.",
  },
  {
    id: "equal-count",
    paths: ["groups.*.items"],
    description:
      "Both groups have equal collection length, 1..3 items each, including zero-byte items.",
  },
  {
    id: "unequal-totals",
    paths: ["groups.*.items.*.bytes"],
    description: "The two exact byte totals differ.",
  },
  {
    id: "common-scale",
    paths: ["groups.*.items.*.bytes", "measure.scaleMaximumBytes"],
    description:
      "The common positive integer scale is at most 60000000 and at least each group byte total.",
  },
];

type ValidateGlobalItemIdentityOptions = {
  input: z.output<typeof baseInputSchema>;
  context: z.RefinementCtx;
};
/** Checks that item identities remain unique across both groups. */
function _validateGlobalItemIdentity({
  input,
  context,
}: Readonly<ValidateGlobalItemIdentityOptions>): void {
  if (
    new Set(
      input.groups.flatMap((group) => {
        return group.items.map(prop("id"));
      }),
    ).size !==
    input.groups.reduce((sum, group) => {
      return sum + group.items.length;
    }, 0)
  ) {
    context.addIssue({
      code: "custom",
      path: ["groups"],
      message: "Item IDs are globally unique across both groups.",
    });
  }
}

type ValidateUnequalByteTotalsOptions = {
  input: z.output<typeof baseInputSchema>;
  context: z.RefinementCtx;
};
/** Checks that the equally sized groups retain different byte totals. */
function _validateUnequalByteTotals({
  input,
  context,
}: Readonly<ValidateUnequalByteTotalsOptions>): void {
  if (
    input.groups.length === 2 &&
    input.groups[0].items.reduce((sum, item) => {
      return sum + item.bytes;
    }, 0) ===
      input.groups[1].items.reduce((sum, item) => {
        return sum + item.bytes;
      }, 0)
  ) {
    context.addIssue({
      code: "custom",
      path: ["groups"],
      message: "The two exact byte totals differ.",
    });
  }
}
