import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./ScopeAperture.fixtures";
import authoredMetadata from "./ScopeAperture.metadata.yaml";
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
    path: "broadTopic",
    label: {
      id: "motionAtlas.scope-aperture.controls.broadTopic",
      message: "broadTopic",
    },
    kind: "text",
    minLength: 1,
    maxLength: 44,
  },
  {
    path: "topics",
    label: {
      id: "motionAtlas.scope-aperture.controls.topics",
      message: "topics",
    },
    kind: "collection",
    minItems: 3,
    maxItems: 6,
    itemSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          minLength: 0,
          maxLength: 20,
        },
        label: {
          type: "string",
          minLength: 1,
          maxLength: 22,
        },
        included: {
          type: "boolean",
        },
      },
      required: ["id", "label", "included"],
      additionalProperties: false,
    },
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.scope-aperture.controls.id",
          message: "id",
        },
        kind: "text",
        minLength: 0,
        maxLength: 20,
      },
      {
        path: "label",
        label: {
          id: "motionAtlas.scope-aperture.controls.label",
          message: "label",
        },
        kind: "text",
        minLength: 1,
        maxLength: 22,
      },
      {
        path: "included",
        label: {
          id: "motionAtlas.scope-aperture.controls.included",
          message: "included",
        },
        kind: "boolean",
      },
    ],
  },
  {
    path: "focusedQuestion",
    label: {
      id: "motionAtlas.scope-aperture.controls.focusedQuestion",
      message: "focusedQuestion",
    },
    kind: "text",
    minLength: 1,
    maxLength: 52,
  },
  {
    path: "outsideLabel",
    label: {
      id: "motionAtlas.scope-aperture.controls.outsideLabel",
      message: "outsideLabel",
    },
    kind: "text",
    minLength: 1,
    maxLength: 34,
  },
  {
    path: "insideLabel",
    label: {
      id: "motionAtlas.scope-aperture.controls.insideLabel",
      message: "insideLabel",
    },
    kind: "text",
    minLength: 1,
    maxLength: 24,
  },
  {
    path: "showExcludedTopics",
    label: {
      id: "motionAtlas.scope-aperture.controls.showExcludedTopics",
      message: "showExcludedTopics",
    },
    kind: "boolean",
  },
];
/** Explicit default-copy paths include collection item indices. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["broadTopic"],
  ["topics", 0, "label"],
  ["topics", 1, "label"],
  ["topics", 2, "label"],
  ["topics", 3, "label"],
  ["focusedQuestion"],
  ["outsideLabel"],
  ["insideLabel"],
];
/** Complete fictional source binding, independent of renderer modules. */
export const bindingExamples: StockContract<
  typeof DEFAULT_INPUT
>["bindingExamples"] = [
  {
    sourceText: {
      id: "motionAtlas.scope-aperture.bindingExamples.0.sourceText",
      message:
        "This fictional studio explainer focuses on shelves and supply bins; lighting and seating will come later.",
    },
    input: DEFAULT_INPUT,
  },
];
