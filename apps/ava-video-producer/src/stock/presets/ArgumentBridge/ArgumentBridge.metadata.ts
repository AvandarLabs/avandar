import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./ArgumentBridge.fixtures";
import authoredMetadata from "./ArgumentBridge.metadata.yaml";
import type {
  StockContract,
  StockControl,
  StockMetadata,
} from "../../contracts/StockContract.types";
/** Public retrieval copy contains only accepted intent and distinctions. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Serializable controls preserve each complete authored field. */
export const CONTROLS: StockControl[] = [
  {
    path: "premises",
    label: {
      id: "motionAtlas.argument-bridge.controls.premises",
      message: "premises",
    },
    kind: "collection",
    minItems: 2,
    maxItems: 3,
    itemSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          minLength: 0,
          maxLength: 20,
        },
        text: {
          type: "string",
          minLength: 1,
          maxLength: 48,
        },
      },
      required: ["id", "text"],
      additionalProperties: false,
    },
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.argument-bridge.controls.id",
          message: "id",
        },
        kind: "text",
        minLength: 0,
        maxLength: 20,
      },
      {
        path: "text",
        label: {
          id: "motionAtlas.argument-bridge.controls.text",
          message: "text",
        },
        kind: "text",
        minLength: 1,
        maxLength: 48,
      },
    ],
  },
  {
    path: "conclusion",
    label: {
      id: "motionAtlas.argument-bridge.controls.conclusion",
      message: "conclusion",
    },
    kind: "text",
    minLength: 1,
    maxLength: 64,
  },
  {
    path: "relationship",
    label: {
      id: "motionAtlas.argument-bridge.controls.relationship",
      message: "relationship",
    },
    kind: "select",
    options: [
      {
        value: "supports",
        label: {
          id: "motionAtlas.argument-bridge.controls.relationship.supports",
          message: "supports",
        },
      },
      {
        value: "requires",
        label: {
          id: "motionAtlas.argument-bridge.controls.relationship.requires",
          message: "requires",
        },
      },
      {
        value: "suggests",
        label: {
          id: "motionAtlas.argument-bridge.controls.relationship.suggests",
          message: "suggests",
        },
      },
    ],
  },
  {
    path: "connectorText",
    label: {
      id: "motionAtlas.argument-bridge.controls.connectorText",
      message: "connectorText",
    },
    kind: "text",
    minLength: 1,
    maxLength: 30,
  },
  {
    path: "premiseHeading",
    label: {
      id: "motionAtlas.argument-bridge.controls.premiseHeading",
      message: "premiseHeading",
    },
    kind: "text",
    minLength: 0,
    maxLength: 42,
  },
  {
    path: "showIndividualSupports",
    label: {
      id: "motionAtlas.argument-bridge.controls.showIndividualSupports",
      message: "showIndividualSupports",
    },
    kind: "boolean",
  },
];
/** Explicit default-copy paths include collection item indices. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["premises", 0, "text"],
  ["premises", 1, "text"],
  ["conclusion"],
  ["connectorText"],
  ["premiseHeading"],
];
/** Complete fictional source binding, independent of renderer modules. */
export const bindingExamples: StockContract<
  typeof DEFAULT_INPUT
>["bindingExamples"] = [
  {
    sourceText: {
      id: "motionAtlas.argument-bridge.bindingExamples.0.sourceText",
      message:
        "The fictional room has one clear wall and everyone faces it, which supports placing the example board there.",
    },
    input: DEFAULT_INPUT,
  },
];
