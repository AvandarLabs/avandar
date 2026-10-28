import { z } from "zod";
import { makeStockControlsFromSchema } from "../../contracts/makeStockControlsFromSchema/makeStockControlsFromSchema";
import { inputSchema } from "./WideTableToObservations.schema";
import type {
  StockControl,
  StockMessageDescriptor,
} from "../../contracts/StockContract.types";
function _message({
  key,
  message,
}: {
  key: string;
  message: string;
}): StockMessageDescriptor {
  return { id: `motionAtlas.wide-table-to-observations.${key}`, message };
}
/** Inputs for text. */
type TextOptions = {
  path: string;
  minLength: number;
  maxLength: number;
  prefix?: string;
};

function _text({
  path,
  minLength,
  maxLength,
  prefix = path,
}: TextOptions): StockControl {
  return {
    path,
    kind: "text",
    minLength,
    maxLength,
    label: _message({ key: `controls.${prefix}`, message: path }),
  };
}
/** Inputs for number. */
type NumberOptions = {
  path: string;
  min: number;
  max: number;
  step?: number;
  prefix?: string;
};

function _number({
  path,
  min,
  max,
  step,
  prefix = path,
}: NumberOptions): StockControl {
  return {
    path,
    kind: "number",
    min,
    max,
    step,
    label: _message({ key: `controls.${prefix}`, message: path }),
  };
}
/** Inputs for reference. */
type ReferenceOptions = {
  path: string;
  source: string;
  valueKey: string;
  labelKey: string;
  prefix?: string;
};

function _reference({
  path,
  source,
  valueKey,
  labelKey,
  prefix = path,
}: ReferenceOptions): StockControl {
  return {
    path,
    kind: "select",
    optionsFrom: { path: source, valueKey, labelKey },
    label: _message({ key: `controls.${prefix}`, message: path }),
  };
}

/** Explicit ledger columns correspond to one subject-measure pair. */
export const headingMessages: Record<
  "subject" | "measure" | "value" | "unit",
  StockMessageDescriptor
> = {
  subject: _message({ key: "heading.subject", message: "Subject" }),
  measure: _message({ key: "heading.measure", message: "Measure" }),
  value: _message({ key: "heading.value", message: "Value" }),
  unit: _message({ key: "heading.unit", message: "Unit" }),
};
/** A missing measurement remains distinct from zero. */
export const missingMessage: StockMessageDescriptor = _message({
  key: "missing",
  message: "Missing",
});
/** Visible omission count remains present even when every cell is missing. */
export const ledgerMessage: StockMessageDescriptor = _message({
  key: "ledger",
  message: "Omitted missing cells",
});
const supported: StockControl[] = makeStockControlsFromSchema({
  schema: z.toJSONSchema(
    z.strictObject({
      measures: inputSchema.shape.measures,
      missingPolicy: inputSchema.shape.missingPolicy,
      showSourceGuides: inputSchema.shape.showSourceGuides,
      copy: inputSchema.shape.copy,
    }),
  ),
  messageNamespace: "motionAtlas.wide-table-to-observations",
});
/**
 * Exact keyed nullable-number controls and independently editable unit labels.
 */
export const controls: StockControl[] = [
  supported[0],
  {
    path: "subjects",
    kind: "collection",
    label: headingMessages.subject,
    minItems: 2,
    maxItems: 2,
    itemSchema: z.toJSONSchema(inputSchema.shape.subjects.element),
    itemControls: [
      _text({ path: "id", minLength: 0, maxLength: 12, prefix: "subjects.id" }),
      _text({
        path: "label",
        minLength: 1,
        maxLength: 18,
        prefix: "subjects.label",
      }),
      {
        path: "values",
        kind: "collection",
        label: headingMessages.measure,
        help: headingMessages.unit,
        minItems: 2,
        maxItems: 2,
        itemSchema: z.toJSONSchema(
          inputSchema.shape.subjects.element.shape.values.element,
        ),
        itemControls: [
          _reference({
            path: "measureId",
            source: "measures",
            valueKey: "id",
            labelKey: "label",
            prefix: "subjects.values.measureId",
          }),
          {
            ..._number({
              path: "value",
              min: -10000,
              max: 10000,
              step: undefined,
              prefix: "subjects.values.value",
            }),
            label: headingMessages.value,
            help: missingMessage,
            nullable: true,
          },
        ],
      },
    ],
  },
  { ...supported[1], help: ledgerMessage },
  ...supported.slice(2),
];
