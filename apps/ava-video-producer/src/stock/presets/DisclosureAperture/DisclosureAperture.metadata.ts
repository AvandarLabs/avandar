import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./DisclosureAperture.fixtures";
import authoredMetadata from "./DisclosureAperture.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
  StockMessageDescriptor,
} from "../../contracts/StockContract.types";
export { CONTROLS } from "./DisclosureAperture.controls";

function _message({
  key,
  message,
}: {
  key: string;
  message: string;
}): StockMessageDescriptor {
  return { id: `motionAtlas.disclosure-aperture.${key}`, message };
}

/**
 * Public retrieval copy preserves accepted intent without private provenance.
 */
export const metadata: StockMetadata = parseStockMetadata(authoredMetadata);

/**
 * Explicit numeric paths cover all visible default copy across the timeline.
 */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["fields", 0, "label"],
  ["fields", 0, "value"],
  ["fields", 1, "label"],
  ["fields", 1, "value"],
  ["fields", 2, "label"],
  ["fields", 2, "value"],
  ["copy", "source"],
  ["copy", "boundary"],
  ["copy", "destination"],
  ["copy", "retain"],
  ["copy", "share"],
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
        "Our fictional handoff shares the topic and tag while the full observation stays in the local notebook.",
    }),
    input: DEFAULT_INPUT,
  },
];
