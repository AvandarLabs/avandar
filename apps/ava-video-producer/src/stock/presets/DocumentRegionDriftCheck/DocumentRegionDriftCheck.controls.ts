import { z } from "zod";
import { makeStockControlsFromSchema } from "../../contracts/makeStockControlsFromSchema/makeStockControlsFromSchema";
import { inputSchema } from "./DocumentRegionDriftCheck.schema";
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
  return { id: `motionAtlas.document-region-drift-check.${key}`, message };
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

/** Page number caption is independent of the detector ordinal. */
export const pageMessage: StockMessageDescriptor = _message({
  key: "page",
  message: "Page",
});
/** Number supplied by the current detector, never used as a locator. */
export const ordinalMessage: StockMessageDescriptor = _message({
  key: "ordinal",
  message: "Detector table number",
});
const supported: StockControl[] = makeStockControlsFromSchema({
  schema: z.toJSONSchema(
    z.strictObject({
      labels: inputSchema.shape.labels,
      showDetectorOrdinal: inputSchema.shape.showDetectorOrdinal,
      copy: inputSchema.shape.copy,
    }),
  ),
  messageNamespace: "motionAtlas.document-region-drift-check",
});
/** Coordinate tuple controls preserve arbitrarily small positive extents. */
export const controls: StockControl[] = [
  {
    path: "saved",
    kind: "object",
    label: _message({ key: "controls.saved", message: "Saved" }),
    controls: [
      {
        ..._number({
          path: "page",
          min: 1,
          max: 20,
          step: 1,
          prefix: "saved.page",
        }),
        label: pageMessage,
      },
      {
        path: "box",
        kind: "collection",
        label: _message({
          key: "controls.saved.box",
          message: "Left, top, right, bottom",
        }),
        minItems: 4,
        maxItems: 4,
        itemSchema: z.toJSONSchema(z.number().min(0).max(100)),
        itemControls: [
          {
            ..._number({
              path: "",
              min: 0,
              max: 100,
              step: undefined,
              prefix: "saved.box.coordinate",
            }),
            label: _message({
              key: "controls.saved.box.coordinate",
              message: "Coordinate",
            }),
          },
        ],
      },
      _text({
        path: "header",
        minLength: 0,
        maxLength: 30,
        prefix: "saved.header",
      }),
      _text({
        path: "fingerprint",
        minLength: 1,
        maxLength: 16,
        prefix: "saved.fingerprint",
      }),
    ],
  },
  {
    path: "current",
    kind: "object",
    label: _message({ key: "controls.current", message: "Current" }),
    controls: [
      _text({
        path: "header",
        minLength: 0,
        maxLength: 30,
        prefix: "current.header",
      }),
      _text({
        path: "fingerprint",
        minLength: 1,
        maxLength: 16,
        prefix: "current.fingerprint",
      }),
      {
        ..._number({
          path: "detectorOrdinal",
          min: 1,
          max: 9,
          step: 1,
          prefix: "current.detectorOrdinal",
        }),
        label: ordinalMessage,
      },
    ],
  },
  ...supported,
];
