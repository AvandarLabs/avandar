import { prop } from "@avandar/utils";
import { z } from "zod";
import type { StockSemanticRule } from "../../contracts/StockContract.types";

function _assertUniqueIds({
  path,
  ids,
  uniqueIds,
  context,
}: Readonly<{
  path: string;
  ids: readonly string[];
  uniqueIds: ReadonlySet<string>;
  context: z.RefinementCtx;
}>): void {
  if (uniqueIds.size !== ids.length) {
    context.addIssue({
      code: "custom",
      path: [path],
      message: "IDs must be unique.",
    });
  }
}

const identifier: z.ZodString = z.string().max(12);
/** Complete authored case identities, selections and ordered onset bins. */
export const inputSchema = z
  .strictObject({
    cases: z
      .array(
        z.strictObject({
          id: identifier,
          label: z.string().max(20),
          x: z.number().min(0).max(100),
          y: z.number().min(0).max(100),
          onsetBinId: identifier.nullable(),
        }),
      )
      .min(3)
      .max(12),
    timeBins: z
      .array(z.strictObject({ id: identifier, label: z.string().max(16) }))
      .min(3)
      .max(6),
    investigationCaseIds: z.array(identifier).min(1).max(8),
    focusedBinId: identifier.nullable(),
    copy: z.strictObject({
      context: z.string().max(44),
      map: z.string().max(44),
      curve: z.string().max(44),
      unknown: z.string().max(44),
      selected: z.string().max(44),
      total: z.string().max(44),
      unit: z.string().max(44),
    }),
    showIdentityGuides: z.boolean(),
  })
  .superRefine((input, context) => {
    const caseIds = input.cases.map(prop("id"));
    const binIds = input.timeBins.map(prop("id"));
    const caseIdSet = new Set(caseIds);
    const binIdSet = new Set(binIds);
    [
      { path: "cases", ids: caseIds, uniqueIds: caseIdSet },
      { path: "timeBins", ids: binIds, uniqueIds: binIdSet },
      {
        path: "investigationCaseIds",
        ids: input.investigationCaseIds,
        uniqueIds: new Set(input.investigationCaseIds),
      },
    ].forEach(({ path, ids, uniqueIds }) => {
      _assertUniqueIds({ path, ids, uniqueIds, context });
    });
    input.cases.forEach((item, index) => {
      if (item.onsetBinId !== null && !binIdSet.has(item.onsetBinId)) {
        context.addIssue({
          code: "custom",
          path: ["cases", index, "onsetBinId"],
          message: "Unknown onset bin.",
        });
      }
    });
    if (input.focusedBinId !== null && !binIdSet.has(input.focusedBinId)) {
      context.addIssue({
        code: "custom",
        path: ["focusedBinId"],
        message: "Unknown focus bin.",
      });
    }
    if (
      input.investigationCaseIds.some((id) => {
        return !caseIdSet.has(id);
      })
    ) {
      context.addIssue({
        code: "custom",
        path: ["investigationCaseIds"],
        message: "Unknown investigation case.",
      });
    }
  }) satisfies z.ZodType;
/** Schema-inferred accepted document. */
export type Input = z.infer<typeof inputSchema>;
/** Cross-reference and conservation rules. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "unique-identities",
    paths: ["cases.*.id", "timeBins.*.id", "investigationCaseIds"],
    description: "Each ID set is unique, including at most one empty ID.",
  },
  {
    id: "onset-reference",
    paths: ["cases.*.onsetBinId", "timeBins.*.id", "focusedBinId"],
    description:
      "Onset and focused bin references must exist or be null. Null is distinct from an empty-string ID. Supplied bin order is chronological; each case occupies exactly one bin or the unknown compartment.",
  },
  {
    id: "investigation-reference",
    paths: ["investigationCaseIds", "cases.*.id"],
    description:
      "Every investigation ID is an existing case. Investigation and focused-bin selections are independent subsets, never additional records or transmission links.",
  },
];
