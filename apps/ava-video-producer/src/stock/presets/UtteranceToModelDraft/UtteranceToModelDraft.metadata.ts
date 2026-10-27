import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./UtteranceToModelDraft.fixtures";
import authoredMetadata from "./UtteranceToModelDraft.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
} from "../../contracts/StockContract.types";
export { controls } from "./UtteranceToModelDraft.controls";
/** Public descriptors with no private provenance. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Every authored default prose path, including nested review copy. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["sentenceParts", 0, "text"],
  ["sentenceParts", 1, "text"],
  ["sentenceParts", 2, "text"],
  ["sentenceParts", 3, "text"],
  ["draft", "entities", 0, "label"],
  ["draft", "entities", 1, "label"],
  ["draft", "relationships", 0, "label"],
  ["review", "reviewerLabel"],
  ["review", "note"],
  ["copy", "source"],
  ["copy", "draft"],
  ["copy", "entity"],
  ["copy", "relationship"],
  ["copy", "attribute"],
  ["copy", "accepted"],
  ["copy", "pending"],
  ["copy", "example"],
];
/** Complete authored example, preserved verbatim. */
export const bindingExamples: StockContract<
  typeof DEFAULT_INPUT
>["bindingExamples"] = [
  {
    sourceText: {
      id: "motionAtlas.utterance-to-model-draft.binding",
      message:
        "The fictional description A tool belongs to a workshop is mapped to Tool and Workshop entities plus one directed belongs to relationship. The supplied draft awaits the demo workspace owner's review; the animation performs no live inference.",
    },
    input: DEFAULT_INPUT,
  },
];
