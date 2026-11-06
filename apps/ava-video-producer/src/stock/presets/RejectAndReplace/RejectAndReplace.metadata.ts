import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./RejectAndReplace.fixtures";
import authoredMetadata from "./RejectAndReplace.metadata.yaml";
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
  return { id: `motionAtlas.reject-and-replace.${key}`, message };
}
/** Public retrieval copy excludes private source provenance. */
export const metadata: StockMetadata = parseStockMetadata(authoredMetadata);
/** Serializable recursive controls preserve complete authored inputs. */
export const CONTROLS: StockControl[] = [
  {
    path: "criterion",
    label: {
      id: "motionAtlas.reject-and-replace.controls.criterion",
      message: "criterion",
    },
    kind: "text",
    minLength: 1,
    maxLength: 58,
  },
  {
    path: "rejected",
    label: {
      id: "motionAtlas.reject-and-replace.controls.rejected",
      message: "rejected",
    },
    kind: "object",
    controls: [
      {
        path: "label",
        label: {
          id: "motionAtlas.reject-and-replace.controls.label",
          message: "label",
        },
        kind: "text",
        minLength: 1,
        maxLength: 24,
      },
      {
        path: "reason",
        label: {
          id: "motionAtlas.reject-and-replace.controls.reason",
          message: "reason",
        },
        kind: "text",
        minLength: 1,
        maxLength: 42,
      },
    ],
  },
  {
    path: "replacement",
    label: {
      id: "motionAtlas.reject-and-replace.controls.replacement",
      message: "replacement",
    },
    kind: "object",
    controls: [
      {
        path: "label",
        label: {
          id: "motionAtlas.reject-and-replace.controls.label",
          message: "label",
        },
        kind: "text",
        minLength: 1,
        maxLength: 24,
      },
      {
        path: "reason",
        label: {
          id: "motionAtlas.reject-and-replace.controls.reason",
          message: "reason",
        },
        kind: "text",
        minLength: 1,
        maxLength: 42,
      },
    ],
  },
  {
    path: "decisionLabels",
    label: {
      id: "motionAtlas.reject-and-replace.controls.decisionLabels",
      message: "decisionLabels",
    },
    kind: "object",
    controls: [
      {
        path: "rejected",
        label: {
          id: "motionAtlas.reject-and-replace.controls.rejected",
          message: "rejected",
        },
        kind: "text",
        minLength: 1,
        maxLength: 16,
      },
      {
        path: "selected",
        label: {
          id: "motionAtlas.reject-and-replace.controls.selected",
          message: "selected",
        },
        kind: "text",
        minLength: 1,
        maxLength: 16,
      },
    ],
  },
  {
    path: "showCriterionLink",
    label: {
      id: "motionAtlas.reject-and-replace.controls.showCriterionLink",
      message: "showCriterionLink",
    },
    kind: "boolean",
  },
  {
    path: "rejectionMark",
    label: {
      id: "motionAtlas.reject-and-replace.controls.rejectionMark",
      message: "rejectionMark",
    },
    kind: "select",
    options: [
      {
        value: "cross",
        label: {
          id: "motionAtlas.reject-and-replace.options.cross",
          message: "cross",
        },
      },
      {
        value: "strike",
        label: {
          id: "motionAtlas.reject-and-replace.options.strike",
          message: "strike",
        },
      },
    ],
  },
];
/** Explicit indexed paths identify visible default copy only. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["criterion"],
  ["rejected", "label"],
  ["rejected", "reason"],
  ["replacement", "label"],
  ["replacement", "reason"],
  ["decisionLabels", "rejected"],
  ["decisionLabels", "selected"],
];
/** A complete fictional binding is validated without source inference. */
export const bindingExamples: StockContract<
  typeof DEFAULT_INPUT
>["bindingExamples"] = [
  {
    sourceText: _message({
      key: "bindingExamples.0.sourceText",
      message:
        "For a fictional traveling workshop, set aside the fixed easel and choose a folding easel because it packs for the trip.",
    }),
    input: DEFAULT_INPUT,
  },
];
