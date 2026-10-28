import { prop } from "@avandar/utils";
import { z } from "zod";
import type { StockSemanticRule } from "../../contracts/StockContract.types";
function _unique(values: readonly string[]): boolean {
  return new Set(values).size === values.length;
}
/** Strict source table, exact selected slice and one distinct live edit. */
export const inputSchema = z
  .strictObject({
    table: z.strictObject({
      columns: z
        .array(
          z.strictObject({ id: z.string().max(18), label: z.string().max(18) }),
        )
        .min(2)
        .max(4),
      rows: z
        .array(
          z.strictObject({
            id: z.string().max(18),
            cells: z.array(z.string().max(18)).min(2).max(4),
          }),
        )
        .min(2)
        .max(4),
    }),
    selection: z.strictObject({
      rowIds: z.array(z.string().max(18)).min(1).max(4),
      columnIds: z.array(z.string().max(18)).min(1).max(4),
    }),
    liveEdit: z.strictObject({
      rowId: z.string().max(18),
      columnId: z.string().max(18),
      value: z.string().max(18),
    }),
    publication: z.strictObject({
      revision: z.string().min(1).max(24),
      audience: z.enum(["internal", "public"]),
      label: z.string().min(1).max(24),
    }),
    showExcludedCells: z.boolean(),
    copy: z.strictObject({
      context: z.string().min(1).max(34),
      source: z.string().min(1).max(34),
      result: z.string().min(1).max(34),
    }),
  })
  .superRefine((input, context) => {
    const rowIds = input.table.rows.map(prop("id")),
      columnIds = input.table.columns.map(prop("id"));
    const selected = input.selection;
    if (
      !_unique(rowIds) ||
      !_unique(columnIds) ||
      !_unique(selected.rowIds) ||
      !_unique(selected.columnIds) ||
      input.table.rows.some(({ cells }) => cells.length !== columnIds.length) ||
      selected.rowIds.some((id) => !rowIds.includes(id)) ||
      selected.columnIds.some((id) => !columnIds.includes(id))
    ) {
      context.addIssue({
        code: "custom",
        path: ["selection"],
        message:
          "Unique source IDs, complete cell rows and unique nonempty exact subsets are required.",
      });
    }
    const row = input.table.rows.find(({ id }) => id === input.liveEdit.rowId),
      columnIndex = columnIds.indexOf(input.liveEdit.columnId);
    if (
      !selected.rowIds.includes(input.liveEdit.rowId) ||
      !selected.columnIds.includes(input.liveEdit.columnId) ||
      !row ||
      columnIndex < 0 ||
      row.cells[columnIndex] === input.liveEdit.value
    ) {
      context.addIssue({
        code: "custom",
        path: ["liveEdit"],
        message:
          "Live edit references a selected source cell and differs exactly from its pre-edit value.",
      });
    }
  }) satisfies z.ZodType;

/** Accepted complete authored input. */
export type Input = z.output<typeof inputSchema>;
/** Runtime cross-field rules beyond structural JSON Schema. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "exact-authored-domain",
    paths: [
      "table",
      "selection",
      "liveEdit",
      "publication",
      "showExcludedCells",
      "copy",
    ],
    description:
      "Column and row IDs are exact unique strings with maximum length 18, no minimum. Each source row cells length equals columns length. Selection rowIds/columnIds are nonempty unique subsets of existing source IDs; empty references are valid when an empty target ID exists. Live edit references a selected existing source cell and differs exactly from its pre-edit value. Snapshot cells equal selected rows times selected columns, in selection order, retaining pre-edit values and revision. Audience is explicit and never inferred. Prose meaning, fictional context and suitability are author responsibilities rather than natural-language runtime classification.",
  },
];
