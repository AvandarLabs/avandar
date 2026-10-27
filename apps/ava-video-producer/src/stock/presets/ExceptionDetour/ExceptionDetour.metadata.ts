import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./ExceptionDetour.fixtures";
import authoredMetadata from "./ExceptionDetour.metadata.yaml";
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
    path: "rule",
    label: {
      id: "motionAtlas.exception-detour.controls.rule",
      message: "rule",
    },
    kind: "object",
    controls: [
      {
        path: "label",
        label: {
          id: "motionAtlas.exception-detour.controls.label",
          message: "label",
        },
        kind: "text",
        minLength: 1,
        maxLength: 48,
      },
      {
        path: "outcome",
        label: {
          id: "motionAtlas.exception-detour.controls.outcome",
          message: "outcome",
        },
        kind: "text",
        minLength: 1,
        maxLength: 24,
      },
    ],
  },
  {
    path: "exception",
    label: {
      id: "motionAtlas.exception-detour.controls.exception",
      message: "exception",
    },
    kind: "object",
    controls: [
      {
        path: "condition",
        label: {
          id: "motionAtlas.exception-detour.controls.condition",
          message: "condition",
        },
        kind: "text",
        minLength: 1,
        maxLength: 34,
      },
      {
        path: "outcome",
        label: {
          id: "motionAtlas.exception-detour.controls.outcome",
          message: "outcome",
        },
        kind: "text",
        minLength: 1,
        maxLength: 24,
      },
    ],
  },
  {
    path: "caseLabel",
    label: {
      id: "motionAtlas.exception-detour.controls.caseLabel",
      message: "caseLabel",
    },
    kind: "text",
    minLength: 1,
    maxLength: 34,
  },
  {
    path: "pathLabels",
    label: {
      id: "motionAtlas.exception-detour.controls.pathLabels",
      message: "pathLabels",
    },
    kind: "object",
    controls: [
      {
        path: "standard",
        label: {
          id: "motionAtlas.exception-detour.controls.standard",
          message: "standard",
        },
        kind: "text",
        minLength: 1,
        maxLength: 18,
      },
      {
        path: "exception",
        label: {
          id: "motionAtlas.exception-detour.controls.exception",
          message: "exception",
        },
        kind: "text",
        minLength: 1,
        maxLength: 18,
      },
    ],
  },
  {
    path: "showStandardReference",
    label: {
      id: "motionAtlas.exception-detour.controls.showStandardReference",
      message: "showStandardReference",
    },
    kind: "boolean",
  },
  {
    path: "detourSide",
    label: {
      id: "motionAtlas.exception-detour.controls.detourSide",
      message: "detourSide",
    },
    kind: "select",
    options: [
      {
        value: "above",
        label: {
          id: "motionAtlas.exception-detour.controls.detourSide.above",
          message: "above",
        },
      },
      {
        value: "below",
        label: {
          id: "motionAtlas.exception-detour.controls.detourSide.below",
          message: "below",
        },
      },
    ],
  },
];
/** Explicit default-copy paths include collection item indices. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["rule", "label"],
  ["rule", "outcome"],
  ["exception", "condition"],
  ["exception", "outcome"],
  ["caseLabel"],
  ["pathLabels", "standard"],
  ["pathLabels", "exception"],
];
/** Complete fictional source binding, independent of renderer modules. */
export const bindingExamples: StockContract<
  typeof DEFAULT_INPUT
>["bindingExamples"] = [
  {
    sourceText: {
      id: "motionAtlas.exception-detour.bindingExamples.0.sourceText",
      message:
        "In a fictional studio, borrowed tools return to the shelf unless a part is loose, in which case they go to the repair tray.",
    },
    input: DEFAULT_INPUT,
  },
];
