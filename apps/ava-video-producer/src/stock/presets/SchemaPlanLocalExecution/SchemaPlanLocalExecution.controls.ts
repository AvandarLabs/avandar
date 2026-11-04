import { makeStockControlsFromSchema } from "../../contracts/makeStockControlsFromSchema/makeStockControlsFromSchema";
import { jsonSchema } from "./SchemaPlanLocalExecution.schema";
import type {
  StockJsonSchema,
  StockControl,
} from "../../contracts/StockContract.types";

const NAMESPACE = "motionAtlas.schema-plan-local-execution" as const;
function _label(path: string) {
  return { id: `${NAMESPACE}.controls.${path}`, message: path };
}
const properties: NonNullable<StockJsonSchema["properties"]> =
  jsonSchema.properties!;
const COMPATIBLE_PATHS: string[] = [
  "columns",
  "request",
  "boundaryLabels",
  "showRows",
  "copy",
];
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
    "request.selectedCategory": {
      path: "rows",
      valueKey: "category",
      labelKey: "category",
    },
  },
});
/** Explicit numeric row editor, with shared conversion for supported shapes. */
export const controls: StockControl[] = [
  compatibleControls[0],
  {
    path: "rows",
    label: _label("rows"),
    kind: "collection",
    minItems: 2,
    maxItems: 6,
    itemSchema: {
      type: "object",
      additionalProperties: false,
      required: ["id", "category", "value"],
      properties: {
        id: { type: "string", minLength: 1, maxLength: 12 },
        category: { type: "string", minLength: 1, maxLength: 16 },
        value: { type: "number", minimum: 0, maximum: 100 },
      },
    },
    itemControls: [
      {
        path: "id",
        label: _label("rows.id"),
        kind: "text",
        minLength: 1,
        maxLength: 12,
      },
      {
        path: "category",
        label: _label("rows.category"),
        kind: "text",
        minLength: 1,
        maxLength: 16,
      },
      {
        path: "value",
        label: _label("rows.value"),
        kind: "number",
        min: 0,
        max: 100,
      },
    ],
  },
  ...compatibleControls.slice(1),
];
