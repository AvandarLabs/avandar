import { z } from "zod";
import { inputSchema } from "./PriorityInsertion.schema";
import type { StockControl } from "../../contracts/StockContract.types";

function _copy({ path, message }: { path: string; message: string }) {
  return { id: `motionAtlas.priority-insertion.controls.${path}`, message };
}
/** Serializable recursive controls preserve the accepted authored bounds. */
export const controls: StockControl[] = [
  {
    path: "queue",
    label: _copy({ path: "queue", message: "Queue" }),
    kind: "collection",
    minItems: 3,
    maxItems: 5,
    itemSchema: z.toJSONSchema(inputSchema.shape.queue.element),
    itemControls: [
      {
        path: "id",
        label: _copy({ path: "queue.id", message: "Id" }),
        kind: "text",
        minLength: 0,
        maxLength: 16,
      },
      {
        path: "label",
        label: _copy({ path: "queue.label", message: "Label" }),
        kind: "text",
        minLength: 1,
        maxLength: 16,
      },
    ],
  },
  {
    path: "incomingItem",
    label: _copy({ path: "incomingItem", message: "Incoming item" }),
    kind: "object",
    controls: [
      {
        path: "id",
        label: _copy({ path: "incomingItem.id", message: "Id" }),
        kind: "text",
        minLength: 0,
        maxLength: 16,
      },
      {
        path: "label",
        label: _copy({ path: "incomingItem.label", message: "Label" }),
        kind: "text",
        minLength: 1,
        maxLength: 18,
      },
    ],
  },
  {
    path: "insertBeforeId",
    label: _copy({ path: "insertBeforeId", message: "Insert before id" }),
    kind: "select",
    optionsFrom: { path: "queue", valueKey: "id", labelKey: "label" },
  },
  {
    path: "priorityLabel",
    label: _copy({ path: "priorityLabel", message: "Priority label" }),
    kind: "text",
    minLength: 1,
    maxLength: 34,
  },
  {
    path: "serviceLabel",
    label: _copy({ path: "serviceLabel", message: "Service label" }),
    kind: "text",
    minLength: 1,
    maxLength: 22,
  },
  {
    path: "showOriginalPositions",
    label: _copy({
      path: "showOriginalPositions",
      message: "Show original positions",
    }),
    kind: "boolean",
  },
];
