import { z } from "zod";
import { inputSchema } from "./WorkDecomposition.schema";
import type { StockControl } from "../../contracts/StockContract.types";

function _copy({ path, message }: { path: string; message: string }) {
  return { id: `motionAtlas.work-decomposition.controls.${path}`, message };
}
/** Serializable recursive controls preserve the accepted authored bounds. */
export const controls: StockControl[] = [
  {
    path: "parentLabel",
    label: _copy({ path: "parentLabel", message: "Parent label" }),
    kind: "text",
    minLength: 1,
    maxLength: 28,
  },
  {
    path: "workItems",
    label: _copy({ path: "workItems", message: "Work items" }),
    kind: "collection",
    minItems: 3,
    maxItems: 6,
    itemSchema: z.toJSONSchema(inputSchema.shape.workItems.element),
    itemControls: [
      {
        path: "id",
        label: _copy({ path: "workItems.id", message: "Id" }),
        kind: "text",
        minLength: 0,
        maxLength: 16,
      },
      {
        path: "label",
        label: _copy({ path: "workItems.label", message: "Label" }),
        kind: "text",
        minLength: 1,
        maxLength: 18,
      },
      {
        path: "effort",
        label: _copy({ path: "workItems.effort", message: "Effort" }),
        kind: "number",
        min: 1,
        max: 5,
        step: 1,
      },
    ],
  },
  {
    path: "unitLabel",
    label: _copy({ path: "unitLabel", message: "Unit label" }),
    kind: "text",
    minLength: 1,
    maxLength: 16,
  },
  {
    path: "groupingLabel",
    label: _copy({ path: "groupingLabel", message: "Grouping label" }),
    kind: "text",
    minLength: 1,
    maxLength: 26,
  },
  {
    path: "showEffortValues",
    label: _copy({ path: "showEffortValues", message: "Show effort values" }),
    kind: "boolean",
  },
  {
    path: "partitionLayout",
    label: _copy({ path: "partitionLayout", message: "Partition layout" }),
    kind: "select",
    options: [
      {
        value: "strips",
        label: _copy({ path: "partitionLayout.strips", message: "Strips" }),
      },
      {
        value: "alternating-cuts",
        label: _copy({
          path: "partitionLayout.alternating-cuts",
          message: "alternating-cuts",
        }),
      },
    ],
  },
];
