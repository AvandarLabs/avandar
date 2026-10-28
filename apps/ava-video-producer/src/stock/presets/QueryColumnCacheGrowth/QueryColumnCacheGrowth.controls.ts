import { makeStockControlsFromSchema } from "../../contracts/makeStockControlsFromSchema/makeStockControlsFromSchema";
import { jsonSchema } from "./QueryColumnCacheGrowth.schema";
import type {
  StockJsonSchema,
  StockControl,
} from "../../contracts/StockContract.types";
const NAMESPACE = "motionAtlas.query-column-cache-growth" as const;
function _label(path: string) {
  return { id: `${NAMESPACE}.controls.${path}`, message: path };
}
function _createColumnReferences({
  path,
  prefix,
}: Readonly<{ path: string; prefix: string }>): StockControl {
  return {
    path,
    label: _label(prefix),
    kind: "collection",
    minItems: 1,
    maxItems: 5,
    itemSchema: { type: "string", minLength: 1, maxLength: 12 },
    itemControls: [
      {
        path: "",
        label: _label(`${prefix}.item`),
        kind: "select",
        optionsFrom: {
          path: "columns",
          valueKey: "id",
          labelKey: "label",
          scope: "root",
        },
      },
    ],
  };
}
const properties: NonNullable<StockJsonSchema["properties"]> =
  jsonSchema.properties!;
const COMPATIBLE_PATHS: string[] = ["keyColumnId", "showSetNotation", "copy"];
const compatibleControls: StockControl[] = makeStockControlsFromSchema({
  schema: {
    type: "object",
    additionalProperties: false,
    required: COMPATIBLE_PATHS,
    properties: Object.fromEntries(
      COMPATIBLE_PATHS.map((path) => [path, properties[path]]),
    ),
  },
  messageNamespace: NAMESPACE,
  referenceSelects: {
    keyColumnId: { path: "columns", valueKey: "id", labelKey: "label" },
  },
});
/**
 * Primitive cell/reference collections preserve exact editable string values.
 */
export const controls: StockControl[] = [
  {
    path: "columns",
    label: _label("columns"),
    kind: "collection",
    minItems: 2,
    maxItems: 5,
    itemSchema: {
      type: "object",
      additionalProperties: false,
      required: ["id", "label", "cells"],
      properties: {
        id: { type: "string", minLength: 1, maxLength: 12 },
        label: { type: "string", minLength: 1, maxLength: 18 },
        cells: {
          type: "array",
          minItems: 2,
          maxItems: 5,
          items: { type: "string", maxLength: 16 },
        },
      },
    },
    itemControls: [
      {
        path: "id",
        label: _label("columns.id"),
        kind: "text",
        minLength: 1,
        maxLength: 12,
      },
      {
        path: "label",
        label: _label("columns.label"),
        kind: "text",
        minLength: 1,
        maxLength: 18,
      },
      {
        path: "cells",
        label: _label("columns.cells"),
        kind: "collection",
        minItems: 2,
        maxItems: 5,
        itemSchema: { type: "string", maxLength: 16 },
        itemControls: [
          {
            path: "",
            label: _label("columns.cells.item"),
            kind: "text",
            minLength: 0,
            maxLength: 16,
          },
        ],
      },
    ],
  },
  _createColumnReferences({
    path: "cachedColumnIds",
    prefix: "cachedColumnIds",
  }),
  {
    path: "requests",
    label: _label("requests"),
    kind: "collection",
    minItems: 2,
    maxItems: 2,
    itemSchema: {
      type: "object",
      additionalProperties: false,
      required: ["label", "columnIds"],
      properties: {
        label: { type: "string", minLength: 1, maxLength: 24 },
        columnIds: {
          type: "array",
          minItems: 1,
          maxItems: 5,
          items: { type: "string", minLength: 1, maxLength: 12 },
        },
      },
    },
    itemControls: [
      {
        path: "label",
        label: _label("requests.label"),
        kind: "text",
        minLength: 1,
        maxLength: 24,
      },
      _createColumnReferences({
        path: "columnIds",
        prefix: "requests.columnIds",
      }),
    ],
  },
  ...compatibleControls,
];
