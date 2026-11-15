import { z } from "zod";
import { makeStockControlsFromSchema } from "../../contracts/makeStockControlsFromSchema/makeStockControlsFromSchema";
import { inputSchema } from "./LateTypeEvidence.schema";
import type { StockControl } from "../../contracts/StockContract.types";
/** Explicit numeric controls and reviewed schema-driven prose controls. */
export const controls: StockControl[] = [
  {
    kind: "collection",
    path: "values",
    minItems: 3,
    maxItems: 6,
    itemSchema: z.toJSONSchema(inputSchema.shape.values.element),
    itemControls: [
      {
        kind: "text",
        path: "",
        minLength: 1,
        maxLength: 16,
        label: {
          id: "motionAtlas.late-type-evidence.control.",
          message: "Cell value",
        },
      },
    ],
    label: {
      id: "motionAtlas.late-type-evidence.control.values",
      message: "values",
    },
  },
  ...makeStockControlsFromSchema({
    schema: z.toJSONSchema(
      z.strictObject({ policy: inputSchema.shape.policy }),
    ),
    messageNamespace: "motionAtlas.late-type-evidence",
  }),
  ...makeStockControlsFromSchema({
    schema: z.toJSONSchema(
      z.strictObject({ labels: inputSchema.shape.labels }),
    ),
    messageNamespace: "motionAtlas.late-type-evidence",
  }),
  {
    kind: "boolean",
    path: "showOriginalStrings",
    label: {
      id: "motionAtlas.late-type-evidence.control.showOriginalStrings",
      message: "Retain exact original lexical forms beside output.",
    },
  },
  ...makeStockControlsFromSchema({
    schema: z.toJSONSchema(z.strictObject({ copy: inputSchema.shape.copy })),
    messageNamespace: "motionAtlas.late-type-evidence",
  }),
];
