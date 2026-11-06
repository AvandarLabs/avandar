import { prop } from "@avandar/utils";
import { z } from "zod";
import type { StockSemanticRule } from "../../contracts/StockContract.types";
/** Authored option column. */
export const optionSchema: z.ZodObject<
  { id: z.ZodString; label: z.ZodString },
  z.core.$strict
> = z.strictObject({
  id: z.string().max(20),
  label: z.string().min(1).max(18),
});
/** Explicit categorical state, independent from every other capability. */
export const cellSchema = z.strictObject({
  optionId: z.string().max(20),
  state: z.enum(["included", "absent", "conditional", "unknown"]),
  note: z.string().max(18),
}) satisfies z.ZodType;
/** One bounded row of comparable capability statements. */
export const capabilitySchema = z.strictObject({
  id: z.string().max(20),
  label: z.string().max(22),
  cells: z.array(cellSchema).min(2).max(3),
}) satisfies z.ZodType;
/** Complete matrix with exact option coverage and an authored focus. */
export const inputSchema = z
  .strictObject({
    options: z.array(optionSchema).min(2).max(3),
    capabilities: z.array(capabilitySchema).min(2).max(5),
    stateLabels: z.strictObject({
      included: z.string().min(1).max(14),
      absent: z.string().min(1).max(14),
      conditional: z.string().min(1).max(14),
      unknown: z.string().min(1).max(14),
    }),
    focus: z.strictObject({
      kind: z.enum(["row", "column", "none"]),
      id: z.string().max(20),
    }),
    showNotes: z.boolean(),
    caption: z.string().max(48),
  })
  .superRefine((input, context) => {
    const optionIds = input.options.map(prop("id"));
    Array.from(["options", "capabilities"] as const).forEach((field) => {
      if (
        new Set(input[field].map(prop<{ id: string }, "id", string>("id")))
          .size !== input[field].length
      ) {
        context.addIssue({
          code: "custom",
          path: [field],
          message: "IDs must be unique within their collection.",
        });
      }
    });
    input.capabilities.forEach((row, index) => {
      const cellIds = row.cells.map(prop("optionId"));
      if (
        cellIds.length !== optionIds.length ||
        new Set(cellIds).size !== cellIds.length ||
        cellIds.some((id) => !optionIds.includes(id))
      ) {
        context.addIssue({
          code: "custom",
          path: ["capabilities", index, "cells"],
          message: "Each row needs exactly one cell for each authored option.",
        });
      }
      row.cells.forEach((cell, cellIndex) => {
        if (cell.state === "conditional" && !cell.note.trim()) {
          context.addIssue({
            code: "custom",
            path: ["capabilities", index, "cells", cellIndex, "note"],
            message: "Conditional support requires an authored qualification.",
          });
        }
      });
    });
    const focusIds =
      input.focus.kind === "row"
        ? input.capabilities.map(prop("id"))
        : optionIds;
    if (
      input.focus.kind === "none"
        ? input.focus.id !== ""
        : !focusIds.includes(input.focus.id)
    ) {
      context.addIssue({
        code: "custom",
        path: ["focus", "id"],
        message:
          "Focus must reference its row or column, or be empty for none.",
      });
    }
  }) satisfies z.ZodType;
/** Schema-inferred authored matrix input. */
export type Input = z.output<typeof inputSchema>;
/** Collection relationships and source qualification rules. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "unique-ids",
    paths: ["options.*.id", "capabilities.*.id"],
    description: "IDs are unique within each collection.",
  },
  {
    id: "exact-cell-coverage",
    paths: ["options.*.id", "capabilities.*.cells.*.optionId"],
    description:
      "Every row contains exactly one cell for every authored option, with no other IDs.",
  },
  {
    id: "conditional-qualification",
    paths: ["capabilities.*.cells.*.state", "capabilities.*.cells.*.note"],
    description:
      "Conditional states require a nonblank authored qualification.",
  },
  {
    id: "focus-reference",
    paths: ["focus", "capabilities.*.id", "options.*.id"],
    description:
      "Row or column focus references that collection. None has an empty ID.",
  },
];
