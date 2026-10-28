import { z } from "zod";
import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./TradeoffPivot.fixtures";
import authoredMetadata from "./TradeoffPivot.metadata.yaml";
import { pointSchema } from "./TradeoffPivot.schema";
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
  return { id: `motionAtlas.tradeoff-pivot.${key}`, message };
}
/** Public retrieval copy excludes private source provenance. */
export const metadata: StockMetadata = parseStockMetadata(authoredMetadata);
/** Serializable recursive controls preserve complete authored inputs. */
export const controls: StockControl[] = [
  {
    path: "approach",
    label: {
      id: "motionAtlas.tradeoff-pivot.controls.approach",
      message: "approach",
    },
    kind: "text",
    minLength: 1,
    maxLength: 40,
  },
  {
    path: "gains",
    label: {
      id: "motionAtlas.tradeoff-pivot.controls.gains",
      message: "gains",
    },
    kind: "collection",
    minItems: 1,
    maxItems: 3,
    itemSchema: z.toJSONSchema(pointSchema),
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.tradeoff-pivot.controls.id",
          message: "id",
        },
        kind: "text",
        minLength: 0,
        maxLength: 20,
      },
      {
        path: "label",
        label: {
          id: "motionAtlas.tradeoff-pivot.controls.label",
          message: "label",
        },
        kind: "text",
        minLength: 1,
        maxLength: 32,
      },
    ],
  },
  {
    path: "concessions",
    label: {
      id: "motionAtlas.tradeoff-pivot.controls.concessions",
      message: "concessions",
    },
    kind: "collection",
    minItems: 1,
    maxItems: 3,
    itemSchema: z.toJSONSchema(pointSchema),
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.tradeoff-pivot.controls.id",
          message: "id",
        },
        kind: "text",
        minLength: 0,
        maxLength: 20,
      },
      {
        path: "label",
        label: {
          id: "motionAtlas.tradeoff-pivot.controls.label",
          message: "label",
        },
        kind: "text",
        minLength: 1,
        maxLength: 32,
      },
    ],
  },
  {
    path: "sideLabels",
    label: {
      id: "motionAtlas.tradeoff-pivot.controls.sideLabels",
      message: "sideLabels",
    },
    kind: "object",
    controls: [
      {
        path: "gain",
        label: {
          id: "motionAtlas.tradeoff-pivot.controls.gain",
          message: "gain",
        },
        kind: "text",
        minLength: 1,
        maxLength: 22,
      },
      {
        path: "concession",
        label: {
          id: "motionAtlas.tradeoff-pivot.controls.concession",
          message: "concession",
        },
        kind: "text",
        minLength: 1,
        maxLength: 22,
      },
    ],
  },
  {
    path: "priorityStatement",
    label: {
      id: "motionAtlas.tradeoff-pivot.controls.priorityStatement",
      message: "priorityStatement",
    },
    kind: "text",
    minLength: 1,
    maxLength: 58,
  },
  {
    path: "revealOrder",
    label: {
      id: "motionAtlas.tradeoff-pivot.controls.revealOrder",
      message: "revealOrder",
    },
    kind: "select",
    options: [
      {
        value: "gain-first",
        label: {
          id: "motionAtlas.tradeoff-pivot.options.gain-first",
          message: "gain-first",
        },
      },
      {
        value: "concession-first",
        label: {
          id: "motionAtlas.tradeoff-pivot.options.concession-first",
          message: "concession-first",
        },
      },
    ],
  },
];
/** Explicit indexed paths identify visible default copy only. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["approach"],
  ["gains", 0, "label"],
  ["gains", 1, "label"],
  ["concessions", 0, "label"],
  ["sideLabels", "gain"],
  ["sideLabels", "concession"],
  ["priorityStatement"],
];
/** A complete fictional binding is validated without source inference. */
export const bindingExamples: StockContract<
  typeof DEFAULT_INPUT
>["bindingExamples"] = [
  {
    sourceText: _message({
      key: "bindingExamples.0.sourceText",
      message:
        "The fictional pocket notebook favors portability while giving up room for large sketches.",
    }),
    input: DEFAULT_INPUT,
  },
];
