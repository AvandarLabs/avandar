import { propEq, prop } from "@avandar/utils";
import { z } from "zod";
import type { StockSemanticRule } from "../../contracts/StockContract.types";
/**
 * Complete authored input, with exact collection and accounting constraints.
 */
export const inputSchema = z
  .strictObject({
    cells: z
      .array(
        z.strictObject({
          id: z.string().min(0).max(20),
          label: z.string().min(0).max(16),
          column: z.number().finite().int().min(0).max(3),
          row: z.number().finite().int().min(0).max(2),
          value: z
            .number()
            .finite()
            .min(-1.7976931348623157e308)
            .max(1.7976931348623157e308)
            .nullable(),
        }),
      )
      .min(4)
      .max(12),
    metric: z.strictObject({
      label: z.string().min(0).max(26),
      unit: z.string().min(0).max(12),
      minimum: z
        .number()
        .finite()
        .min(-1.7976931348623157e308)
        .max(1.7976931348623157e308),
      maximum: z
        .number()
        .finite()
        .min(-1.7976931348623157e308)
        .max(1.7976931348623157e308),
      cellAreaHa: z.number().finite().gt(0).max(1000),
      periodLabel: z.string().min(0).max(38),
    }),
    fieldChecks: z
      .array(
        z.strictObject({
          id: z.string().min(0).max(20),
          label: z.string().min(0).max(22),
          cellId: z.string().min(0).max(20),
          value: z
            .number()
            .finite()
            .min(-1.7976931348623157e308)
            .max(1.7976931348623157e308),
        }),
      )
      .min(0)
      .max(3),
    decision: z.strictObject({
      actorLabel: z.string().min(1).max(32),
      actionLabel: z.string().min(1).max(32),
    }),
    context: z.enum(["globe-and-schematic-tile", "schematic-tile"]),
    showCoverageTotals: z.boolean(),
    copy: z.strictObject({
      map: z.string().min(0).max(34),
      observed: z.string().min(0).max(34),
      missing: z.string().min(0).max(34),
      fieldCheck: z.string().min(0).max(34),
      pointSupport: z.string().min(0).max(34),
      areaUnit: z.string().min(0).max(8),
      disclaimer: z.string().min(0).max(48),
    }),
  })
  .superRefine((input, context) => {
    const { cells, metric, fieldChecks } = input;
    if (new Set(cells.map(prop("id"))).size !== cells.length) {
      context.addIssue({
        code: "custom",
        path: ["cells"],
        message: "Cell IDs must be unique.",
      });
    }
    if (new Set(fieldChecks.map(prop("id"))).size !== fieldChecks.length) {
      context.addIssue({
        code: "custom",
        path: ["fieldChecks"],
        message: "Point IDs must be unique.",
      });
    }
    const rows = cells.map(prop("row")),
      columns = cells.map(prop("column"));
    const area =
      (Math.max(...rows) - Math.min(...rows) + 1) *
      (Math.max(...columns) - Math.min(...columns) + 1);
    if (
      new Set(cells.map((cell) => `${cell.row}:${cell.column}`)).size !==
        cells.length ||
      area !== cells.length
    ) {
      context.addIssue({
        code: "custom",
        path: ["cells"],
        message: "Unique cells must fill their bounding rectangle.",
      });
    }
    if (metric.minimum >= metric.maximum) {
      context.addIssue({
        code: "custom",
        path: ["metric"],
        message: "Metric minimum must be below maximum.",
      });
    }
    cells.forEach((cell, index) => {
      if (
        cell.value !== null &&
        (cell.value < metric.minimum || cell.value > metric.maximum)
      ) {
        context.addIssue({
          code: "custom",
          path: ["cells", index, "value"],
          message: "Reading is outside the metric range.",
        });
      }
    });
    fieldChecks.forEach((check, index) => {
      if (
        !cells.some(propEq("id", check.cellId)) ||
        check.value < metric.minimum ||
        check.value > metric.maximum
      ) {
        context.addIssue({
          code: "custom",
          path: ["fieldChecks", index],
          message: "Point needs an existing cell and an in-range value.",
        });
      }
    });
  }) satisfies z.ZodType;
/** Inferred complete scene input. */
export type Input = z.output<typeof inputSchema>;
/** Cross-field rules that structural JSON Schema cannot express. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "unique-cells",
    paths: ["cells.*.id"],
    description: "Cell IDs are unique, including at most one empty ID.",
  },
  {
    id: "unique-points",
    paths: ["fieldChecks.*.id"],
    description:
      "Point IDs are unique, including at most one empty ID. Several points may reference the same cell.",
  },
  {
    id: "rectangle",
    paths: ["cells.*.row", "cells.*.column"],
    description:
      "Coordinates are unique and fill their bounding rectangle. Rows are 0..2 and columns 0..3. The rectangle may start at any accepted coordinate.",
  },
  {
    id: "metric-range",
    paths: ["metric.minimum", "metric.maximum"],
    description:
      "Both metric bounds are finite and minimum is strictly less than maximum.",
  },
  {
    id: "readings",
    paths: ["cells.*.value", "metric"],
    description:
      "Every non-null cell value lies inclusively within the finite metric bounds.",
  },
  {
    id: "point-reference-range",
    paths: [
      "fieldChecks.*.cellId",
      "fieldChecks.*.value",
      "cells.*.id",
      "metric",
    ],
    description:
      "Every point references an existing cell, including an empty ID, and its finite value lies inclusively within metric bounds. Points never change cell-area coverage.",
  },
];
