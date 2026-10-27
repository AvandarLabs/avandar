import { prop } from "@avandar/utils";
import { z } from "zod";
import type {
  StockJsonSchema,
  StockSemanticRule,
} from "../../contracts/StockContract.types";
/** Panel copy preserves exact authored values without combining data. */
export const inputSchema = z
  .strictObject({
    boardTitle: z.string().min(1).max(48),
    widgets: z
      .array(
        z.strictObject({
          id: z.string().max(20),
          title: z.string().max(28),
          kind: z.enum(["value", "list", "note"]),
          lines: z.array(z.string().max(38)).min(1).max(3),
        }),
      )
      .min(2)
      .max(4),
    featuredWidgetId: z.string(),
    layout: z.enum(["feature-left", "feature-top"]),
    scopeLabel: z.string().max(36),
    showGuides: z.boolean(),
  })
  .superRefine((input, context) => {
    const ids = input.widgets.map(prop("id"));
    if (new Set(ids).size !== ids.length) {
      context.addIssue({
        code: "custom",
        path: ["widgets"],
        message: "Widget IDs must be unique.",
      });
    }
    if (!ids.includes(input.featuredWidgetId)) {
      context.addIssue({
        code: "custom",
        path: ["featuredWidgetId"],
        message: "The featured widget must reference exactly one widget.",
      });
    }
    input.widgets.forEach((widget, index) => {
      if (widget.kind === "value" && widget.lines.length !== 1) {
        context.addIssue({
          code: "custom",
          path: ["widgets", index, "lines"],
          message: "Value panels require exactly one line.",
        });
      }
    });
  }) satisfies z.ZodType;
/** Authored board data inferred from runtime validation. */
export type Input = z.output<typeof inputSchema>;
/** Complete structural schema preserves upper-only title and line bounds. */
export const jsonSchema: StockJsonSchema = z.toJSONSchema(inputSchema);
/** Runtime relations preserve individual widget identities and value grain. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "unique-widgets",
    paths: ["widgets.*.id"],
    description: "Every widget ID is unique, including an optional empty ID.",
  },
  {
    id: "featured-reference",
    paths: ["featuredWidgetId", "widgets.*.id"],
    description: "The featured ID references exactly one supplied widget.",
  },
  {
    id: "single-value-line",
    paths: ["widgets.*.kind", "widgets.*.lines"],
    description: "A value widget contains exactly one authored line.",
  },
];
