import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./PocketInference.fixtures";
import authoredMetadata from "./PocketInference.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
  StockMessageDescriptor,
} from "../../contracts/StockContract.types";
export { CONTROLS } from "./PocketInference.controls";

function _message({
  key,
  message,
}: {
  key: string;
  message: string;
}): StockMessageDescriptor {
  return { id: `motionAtlas.pocket-inference.${key}`, message };
}

/**
 * Public retrieval copy preserves accepted intent without private provenance.
 */
export const metadata: StockMetadata = parseStockMetadata(authoredMetadata);

/**
 * Explicit numeric paths cover all visible default copy across the timeline.
 */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["model", "label"],
  ["model", "detail"],
  ["input", "label"],
  ["input", "text"],
  ["response", "label"],
  ["response", "lines", 0],
  ["copy", "device"],
  ["copy", "boundary"],
  ["copy", "example"],
];

/** Complete fictional binding, validated without inference. */
export const bindingExamples: StockContract<
  typeof DEFAULT_INPUT
>["bindingExamples"] = [
  {
    sourceText: _message({
      key: "bindingExamples.0.sourceText",
      message:
        "This fictional tablet carries an installed small language model and performs the illustrated rewriting task within the device.",
    }),
    input: DEFAULT_INPUT,
  },
];
