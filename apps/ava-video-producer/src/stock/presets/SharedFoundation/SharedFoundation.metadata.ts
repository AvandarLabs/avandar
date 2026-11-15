import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./SharedFoundation.fixtures";
import authoredMetadata from "./SharedFoundation.metadata.yaml";
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
    path: "approaches",
    label: {
      id: "motionAtlas.shared-foundation.controls.approaches",
      message: "approaches",
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
        label: {
          type: "string",
          minLength: 1,
          maxLength: 24,
        },
        distinction: {
          type: "string",
          minLength: 1,
          maxLength: 36,
        },
      },
      required: ["id", "label", "distinction"],
      additionalProperties: false,
    },
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.shared-foundation.controls.id",
          message: "id",
        },
        kind: "text",
        minLength: 0,
        maxLength: 20,
      },
      {
        path: "label",
        label: {
          id: "motionAtlas.shared-foundation.controls.label",
          message: "label",
        },
        kind: "text",
        minLength: 1,
        maxLength: 24,
      },
      {
        path: "distinction",
        label: {
          id: "motionAtlas.shared-foundation.controls.distinction",
          message: "distinction",
        },
        kind: "text",
        minLength: 1,
        maxLength: 36,
      },
    ],
  },
  {
    path: "sharedPrinciple",
    label: {
      id: "motionAtlas.shared-foundation.controls.sharedPrinciple",
      message: "sharedPrinciple",
    },
    kind: "text",
    minLength: 1,
    maxLength: 58,
  },
  {
    path: "foundationLabel",
    label: {
      id: "motionAtlas.shared-foundation.controls.foundationLabel",
      message: "foundationLabel",
    },
    kind: "text",
    minLength: 1,
    maxLength: 26,
  },
  {
    path: "openingConnector",
    label: {
      id: "motionAtlas.shared-foundation.controls.openingConnector",
      message: "openingConnector",
    },
    kind: "text",
    minLength: 0,
    maxLength: 26,
  },
  {
    path: "showDistinctTraits",
    label: {
      id: "motionAtlas.shared-foundation.controls.showDistinctTraits",
      message: "showDistinctTraits",
    },
    kind: "boolean",
  },
  {
    path: "foundationReveal",
    label: {
      id: "motionAtlas.shared-foundation.controls.foundationReveal",
      message: "foundationReveal",
    },
    kind: "select",
    options: [
      {
        value: "join",
        label: {
          id: "motionAtlas.shared-foundation.controls.foundationReveal.join",
          message: "join",
        },
      },
      {
        value: "uncover",
        label: {
          id: "motionAtlas.shared-foundation.controls.foundationReveal.uncover",
          message: "uncover",
        },
      },
    ],
  },
];
/** Explicit default-copy paths include collection item indices. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["approaches", 0, "label"],
  ["approaches", 0, "distinction"],
  ["approaches", 1, "label"],
  ["approaches", 1, "distinction"],
  ["sharedPrinciple"],
  ["foundationLabel"],
  ["openingConnector"],
];
/** Complete fictional source binding, independent of renderer modules. */
export const bindingExamples: StockContract<
  typeof DEFAULT_INPUT
>["bindingExamples"] = [
  {
    sourceText: {
      id: "motionAtlas.shared-foundation.bindingExamples.0.sourceText",
      message:
        "Written and drawn directions take different forms but share the purpose of making the fictional route understandable.",
    },
    input: DEFAULT_INPUT,
  },
];
