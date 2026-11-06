import { z } from "zod";
import { makeStockControlsFromSchema } from "../../contracts/makeStockControlsFromSchema/makeStockControlsFromSchema";
import { inputSchema } from "./ProseMeasurementLedger.schema";
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
  return { id: `motionAtlas.prose-measurement-ledger.${key}`, message };
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

/** Localized semantic slot headings also serve the role selector. */
export const roleMessages: Record<
  | "subject"
  | "metric"
  | "value"
  | "unit"
  | "period"
  | "qualifier"
  | "connector",
  StockMessageDescriptor
> = {
  subject: _message({ key: "role.subject", message: "Subject" }),
  metric: _message({ key: "role.metric", message: "Metric" }),
  value: _message({ key: "role.value", message: "Value" }),
  unit: _message({ key: "role.unit", message: "Unit" }),
  period: _message({ key: "role.period", message: "Period" }),
  qualifier: _message({ key: "role.qualifier", message: "Qualifier" }),
  connector: _message({ key: "role.connector", message: "Connector" }),
};
/** Extraction method stays separate from review status. */
export const methodMessages: {
  rules: StockMessageDescriptor;
  "model-assisted": StockMessageDescriptor;
} = {
  rules: _message({ key: "method.rules", message: "Rules" }),
  "model-assisted": _message({
    key: "method.model-assisted",
    message: "Model assisted",
  }),
};
/** Authored observation review labels. */
export const reviewMessages: {
  reviewed: StockMessageDescriptor;
  "needs-review": StockMessageDescriptor;
} = {
  reviewed: _message({ key: "review.reviewed", message: "Reviewed" }),
  "needs-review": _message({
    key: "review.needs-review",
    message: "Needs review",
  }),
};
const supported: StockControl[] = makeStockControlsFromSchema({
  schema: z.toJSONSchema(
    z.strictObject({
      showSourceSpans: inputSchema.shape.showSourceSpans,
      copy: inputSchema.shape.copy,
    }),
  ),
  messageNamespace: "motionAtlas.prose-measurement-ledger",
});
/**
 * Recursive controls include authored UTF-16 offsets without hidden output
 * fields.
 */
export const controls: StockControl[] = [
  {
    path: "fragments",
    kind: "collection",
    label: _message({ key: "controls.fragments", message: "Fragments" }),
    minItems: 6,
    maxItems: 9,
    itemSchema: z.toJSONSchema(inputSchema.shape.fragments.element),
    itemControls: [
      _text({
        path: "id",
        minLength: 1,
        maxLength: 12,
        prefix: "fragments.id",
      }),
      _text({
        path: "text",
        minLength: 1,
        maxLength: 30,
        prefix: "fragments.text",
      }),
      {
        path: "role",
        kind: "select",
        label: _message({ key: "controls.fragments.role", message: "Role" }),
        options: Object.entries(roleMessages).map(([value, label]) => ({
          value,
          label,
        })),
      },
      _number({
        path: "contentStart",
        min: 0,
        max: 30,
        step: 1,
        prefix: "fragments.contentStart",
      }),
      _number({
        path: "contentEnd",
        min: 0,
        max: 30,
        step: 1,
        prefix: "fragments.contentEnd",
      }),
    ],
  },
  supported[0],
  {
    path: "method",
    kind: "select",
    label: _message({ key: "controls.method", message: "Method" }),
    options: Object.entries(methodMessages).map(([value, label]) => ({
      value,
      label,
    })),
  },
  {
    path: "reviewState",
    kind: "select",
    label: _message({ key: "controls.reviewState", message: "Review state" }),
    options: Object.entries(reviewMessages).map(([value, label]) => ({
      value,
      label,
    })),
  },
  supported[1],
];
