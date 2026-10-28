import { prop } from "@avandar/utils";
import { z } from "zod";
import type {
  StockJsonSchema,
  StockSemanticRule,
} from "../../contracts/StockContract.types";
const columnIds: z.ZodArray<z.ZodString> = z
  .array(z.string().min(1).max(12))
  .min(1)
  .max(5);
/**
 * One relation grows by exact column union without changing row occurrences.
 */
export const inputSchema = z
  .strictObject({
    columns: z
      .array(
        z.strictObject({
          id: z.string().min(1).max(12),
          label: z.string().min(1).max(18),
          cells: z.array(z.string().max(16)).min(2).max(5),
        }),
      )
      .min(2)
      .max(5),
    cachedColumnIds: columnIds,
    requests: z
      .array(z.strictObject({ label: z.string().min(1).max(24), columnIds }))
      .length(2),
    keyColumnId: z.string().min(1).max(12),
    showSetNotation: z.boolean(),
    copy: z.strictObject({
      context: z.string().min(1).max(38),
      before: z.string().min(1).max(38),
      after: z.string().min(1).max(38),
    }),
  })
  .superRefine((input, context) => {
    const ids = input.columns.map(prop("id"));
    if (new Set(ids).size !== ids.length) {
      context.addIssue({
        code: "custom",
        path: ["columns"],
        message: "Column IDs must be unique.",
      });
    }
    if (
      input.columns.some(
        ({ cells }) => cells.length !== input.columns[0]?.cells.length,
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["columns"],
        message: "All columns must have equal cell lengths.",
      });
    }
    [input.cachedColumnIds, ...input.requests.map(prop("columnIds"))].forEach(
      (refs, index) => {
        if (
          new Set(refs).size !== refs.length ||
          refs.some((id) => !ids.includes(id))
        ) {
          context.addIssue({
            code: "custom",
            path:
              index === 0
                ? ["cachedColumnIds"]
                : ["requests", index - 1, "columnIds"],
            message: "References must be a unique nonempty subset of columns.",
          });
        }
      },
    );
    if (
      !ids.includes(input.keyColumnId) ||
      !input.cachedColumnIds.includes(input.keyColumnId)
    ) {
      context.addIssue({
        code: "custom",
        path: ["keyColumnId"],
        message: "Key must reference a cached column.",
      });
    }
    if (
      input.requests[0]?.columnIds.some(
        (id) => !input.cachedColumnIds.includes(id),
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["requests", 0],
        message: "First request must be covered.",
      });
    }
    if (
      input.requests[1] &&
      !input.requests[1].columnIds.some(
        (id) => !input.cachedColumnIds.includes(id),
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["requests", 1],
        message: "Second request must add a column.",
      });
    }
  }) satisfies z.ZodType;
/** Authored output type. */
export type Input = z.output<typeof inputSchema>;
/** Structural bounds for data-only editors. */
export const jsonSchema: StockJsonSchema = z.toJSONSchema(inputSchema);
/** Exact set and row-grain rules beyond structural JSON Schema. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "unique-columns",
    paths: ["columns.*.id"],
    description: "The 2..5 column IDs are unique.",
  },
  {
    id: "equal-row-lengths",
    paths: ["columns.*.cells"],
    description:
      "Every column has the same 2..5 row occurrences, including duplicates and empty strings.",
  },
  {
    id: "unique-reference-subsets",
    paths: ["cachedColumnIds", "requests.*.columnIds", "columns.*.id"],
    description:
      "Cache and each request contain unique nonempty subsets of existing column IDs.",
  },
  {
    id: "cached-key",
    paths: ["keyColumnId", "cachedColumnIds", "columns.*.id"],
    description:
      "Key references an existing column and belongs to the initial cache.",
  },
  {
    id: "covered-first-request",
    paths: ["requests.0.columnIds", "cachedColumnIds"],
    description: "The first request is entirely covered by the initial cache.",
  },
  {
    id: "growing-second-request",
    paths: ["requests.1.columnIds", "cachedColumnIds"],
    description:
      "The second request adds at least one missing column. One cache grows to the union by appending missing source columns without deduplication or sorting of rows.",
  },
];
