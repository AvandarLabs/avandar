import { z } from "zod";
import { inputSchema } from "./ContactWindowOverlap.schema";
import type { StockControl } from "../../contracts/StockContract.types";

function _copy({ path, message }: { path: string; message: string }) {
  return { id: `motionAtlas.contact-window-overlap.controls.${path}`, message };
}
/** Complete recursive editors, including nullable and referenced values. */
export const controls: StockControl[] = [
  {
    path: "records",
    label: _copy({ path: "records", message: "Records" }),
    kind: "collection",
    minItems: 2,
    maxItems: 6,
    itemSchema: z.toJSONSchema(inputSchema.shape.records.element),
    itemControls: [
      {
        path: "id",
        label: _copy({ path: "records.id", message: "Id" }),
        kind: "text",
        minLength: 0,
        maxLength: 16,
      },
      {
        path: "label",
        label: _copy({ path: "records.label", message: "Label" }),
        kind: "text",
        minLength: 0,
        maxLength: 18,
      },
      {
        path: "start",
        label: _copy({ path: "records.start", message: "Start" }),
        nullable: true,
        kind: "number",
        min: 0,
        max: 12,
      },
      {
        path: "end",
        label: _copy({ path: "records.end", message: "End" }),
        nullable: true,
        kind: "number",
        min: 0,
        max: 12,
      },
    ],
  },
  {
    path: "investigationWindow",
    label: _copy({
      path: "investigationWindow",
      message: "Investigation window",
    }),
    kind: "object",
    controls: [
      {
        path: "start",
        label: _copy({ path: "investigationWindow.start", message: "Start" }),
        kind: "number",
        min: 0,
        max: 12,
      },
      {
        path: "end",
        label: _copy({ path: "investigationWindow.end", message: "End" }),
        kind: "number",
        min: 0,
        max: 12,
      },
      {
        path: "label",
        label: _copy({ path: "investigationWindow.label", message: "Label" }),
        kind: "text",
        minLength: 1,
        maxLength: 28,
      },
    ],
  },
  {
    path: "axis",
    label: _copy({ path: "axis", message: "Axis" }),
    kind: "object",
    controls: [
      {
        path: "start",
        label: _copy({ path: "axis.start", message: "Start" }),
        kind: "number",
        min: 0,
        max: 0,
      },
      {
        path: "end",
        label: _copy({ path: "axis.end", message: "End" }),
        kind: "number",
        min: 2,
        max: 12,
        step: 1,
      },
      {
        path: "unitLabel",
        label: _copy({ path: "axis.unitLabel", message: "Unit label" }),
        kind: "text",
        minLength: 1,
        maxLength: 24,
      },
      {
        path: "venueLabel",
        label: _copy({ path: "axis.venueLabel", message: "Venue label" }),
        kind: "text",
        minLength: 1,
        maxLength: 24,
      },
    ],
  },
  {
    path: "sceneLabel",
    label: _copy({ path: "sceneLabel", message: "Scene label" }),
    kind: "text",
    minLength: 1,
    maxLength: 40,
  },
  {
    path: "showOverlapFractions",
    label: _copy({
      path: "showOverlapFractions",
      message: "Show overlap fractions",
    }),
    kind: "boolean",
  },
  {
    path: "copy",
    label: _copy({ path: "copy", message: "Copy" }),
    kind: "object",
    controls: [
      {
        path: "overlap",
        label: _copy({ path: "copy.overlap", message: "Overlap" }),
        kind: "text",
        minLength: 1,
        maxLength: 42,
      },
      {
        path: "none",
        label: _copy({ path: "copy.none", message: "None" }),
        kind: "text",
        minLength: 1,
        maxLength: 42,
      },
      {
        path: "unknown",
        label: _copy({ path: "copy.unknown", message: "Unknown" }),
        kind: "text",
        minLength: 1,
        maxLength: 42,
      },
      {
        path: "denominator",
        label: _copy({ path: "copy.denominator", message: "Denominator" }),
        kind: "text",
        minLength: 1,
        maxLength: 42,
      },
      {
        path: "qualifier",
        label: _copy({ path: "copy.qualifier", message: "Qualifier" }),
        kind: "text",
        minLength: 1,
        maxLength: 42,
      },
    ],
  },
];
