import { z } from "zod";
import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./PairedContrast.fixtures";
import authoredMetadata from "./PairedContrast.metadata.yaml";
import { alternativeSchema, criterionSchema } from "./PairedContrast.schema";
import type {
  StockContract,
  StockControl,
  StockMetadata,
  StockMessageDescriptor,
} from "../../contracts/StockContract.types";

function _message({
  key,
  message,
}: {
  key: string;
  message: string;
}): StockMessageDescriptor {
  return { id: `motionAtlas.paired-contrast.${key}`, message };
}
/** Public retrieval copy excludes private source provenance. */
export const metadata: StockMetadata = parseStockMetadata(authoredMetadata);
/** Serializable recursive controls preserve complete authored inputs. */
export const controls: StockControl[] = [
  {
    path: "question",
    label: {
      id: "motionAtlas.paired-contrast.controls.question",
      message: "question",
    },
    kind: "text",
    minLength: 1,
    maxLength: 60,
  },
  {
    path: "alternatives",
    label: {
      id: "motionAtlas.paired-contrast.controls.alternatives",
      message: "alternatives",
    },
    kind: "collection",
    minItems: 2,
    maxItems: 2,
    itemSchema: z.toJSONSchema(alternativeSchema),
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.paired-contrast.controls.id",
          message: "id",
        },
        kind: "text",
        minLength: 0,
        maxLength: 20,
      },
      {
        path: "label",
        label: {
          id: "motionAtlas.paired-contrast.controls.label",
          message: "label",
        },
        kind: "text",
        minLength: 1,
        maxLength: 24,
      },
    ],
  },
  {
    path: "criteria",
    label: {
      id: "motionAtlas.paired-contrast.controls.criteria",
      message: "criteria",
    },
    kind: "collection",
    minItems: 1,
    maxItems: 3,
    itemSchema: z.toJSONSchema(criterionSchema),
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.paired-contrast.controls.id",
          message: "id",
        },
        kind: "text",
        minLength: 0,
        maxLength: 20,
      },
      {
        path: "label",
        label: {
          id: "motionAtlas.paired-contrast.controls.label",
          message: "label",
        },
        kind: "text",
        minLength: 0,
        maxLength: 20,
      },
      {
        path: "leftText",
        label: {
          id: "motionAtlas.paired-contrast.controls.leftText",
          message: "leftText",
        },
        kind: "text",
        minLength: 0,
        maxLength: 34,
      },
      {
        path: "rightText",
        label: {
          id: "motionAtlas.paired-contrast.controls.rightText",
          message: "rightText",
        },
        kind: "text",
        minLength: 0,
        maxLength: 34,
      },
    ],
  },
  {
    path: "focusCriterionId",
    label: {
      id: "motionAtlas.paired-contrast.controls.focusCriterionId",
      message: "focusCriterionId",
    },
    kind: "select",
    optionsFrom: {
      path: "criteria",
      valueKey: "id",
      labelKey: "label",
    },
  },
  {
    path: "comparisonLabel",
    label: {
      id: "motionAtlas.paired-contrast.controls.comparisonLabel",
      message: "comparisonLabel",
    },
    kind: "text",
    minLength: 0,
    maxLength: 48,
  },
  {
    path: "showPairBrackets",
    label: {
      id: "motionAtlas.paired-contrast.controls.showPairBrackets",
      message: "showPairBrackets",
    },
    kind: "boolean",
  },
];
/** Explicit indexed paths identify visible default copy only. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["question"],
  ["alternatives", 0, "label"],
  ["alternatives", 1, "label"],
  ["criteria", 0, "label"],
  ["criteria", 0, "leftText"],
  ["criteria", 0, "rightText"],
  ["criteria", 1, "label"],
  ["criteria", 1, "leftText"],
  ["criteria", 1, "rightText"],
  ["comparisonLabel"],
];
/** A complete fictional binding is validated without source inference. */
export const bindingExamples: StockContract<
  typeof DEFAULT_INPUT
>["bindingExamples"] = [
  {
    sourceText: _message({
      key: "bindingExamples.0.sourceText",
      message:
        "In a fictional writing club, solo review uses a self-check while pair review adds a shared discussion.",
    }),
    input: DEFAULT_INPUT,
  },
];
