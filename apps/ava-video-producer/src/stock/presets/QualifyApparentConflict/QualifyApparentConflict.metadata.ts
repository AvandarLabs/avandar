import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./QualifyApparentConflict.fixtures";
import authoredMetadata from "./QualifyApparentConflict.metadata.yaml";
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
    path: "statements",
    label: {
      id: "motionAtlas.qualify-apparent-conflict.controls.statements",
      message: "statements",
    },
    kind: "collection",
    minItems: 2,
    maxItems: 2,
    itemSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          minLength: 0,
          maxLength: 20,
        },
        claim: {
          type: "string",
          minLength: 1,
          maxLength: 42,
        },
        context: {
          type: "string",
          minLength: 1,
          maxLength: 32,
        },
      },
      required: ["id", "claim", "context"],
      additionalProperties: false,
    },
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.qualify-apparent-conflict.controls.id",
          message: "id",
        },
        kind: "text",
        minLength: 0,
        maxLength: 20,
      },
      {
        path: "claim",
        label: {
          id: "motionAtlas.qualify-apparent-conflict.controls.claim",
          message: "claim",
        },
        kind: "text",
        minLength: 1,
        maxLength: 42,
      },
      {
        path: "context",
        label: {
          id: "motionAtlas.qualify-apparent-conflict.controls.context",
          message: "context",
        },
        kind: "text",
        minLength: 1,
        maxLength: 32,
      },
    ],
  },
  {
    path: "openingLabel",
    label: {
      id: "motionAtlas.qualify-apparent-conflict.controls.openingLabel",
      message: "openingLabel",
    },
    kind: "text",
    minLength: 1,
    maxLength: 26,
  },
  {
    path: "qualifier",
    label: {
      id: "motionAtlas.qualify-apparent-conflict.controls.qualifier",
      message: "qualifier",
    },
    kind: "text",
    minLength: 1,
    maxLength: 64,
  },
  {
    path: "connectorLabel",
    label: {
      id: "motionAtlas.qualify-apparent-conflict.controls.connectorLabel",
      message: "connectorLabel",
    },
    kind: "text",
    minLength: 1,
    maxLength: 26,
  },
  {
    path: "contextPlacement",
    label: {
      id: "motionAtlas.qualify-apparent-conflict.controls.contextPlacement",
      message: "contextPlacement",
    },
    kind: "select",
    options: [
      {
        value: "above",
        label: {
          id: "motionAtlas.qualify-apparent-conflict.controls.contextPlacement.above",
          message: "above",
        },
      },
      {
        value: "below",
        label: {
          id: "motionAtlas.qualify-apparent-conflict.controls.contextPlacement.below",
          message: "below",
        },
      },
    ],
  },
  {
    path: "showCentralDivider",
    label: {
      id: "motionAtlas.qualify-apparent-conflict.controls.showCentralDivider",
      message: "showCentralDivider",
    },
    kind: "boolean",
  },
];
/** Explicit default-copy paths include collection item indices. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["statements", 0, "claim"],
  ["statements", 0, "context"],
  ["statements", 1, "claim"],
  ["statements", 1, "context"],
  ["openingLabel"],
  ["qualifier"],
  ["connectorLabel"],
];
/** Complete fictional source binding, independent of renderer modules. */
export const bindingExamples: StockContract<
  typeof DEFAULT_INPUT
>["bindingExamples"] = [
  {
    sourceText: {
      id: "motionAtlas.qualify-apparent-conflict.bindingExamples.0.sourceText",
      message:
        "A fictional sketch can call for loose marks early and precise edges later; the two statements refer to different stages.",
    },
    input: DEFAULT_INPUT,
  },
];
