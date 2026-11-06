import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./PrivateCaseConversation.fixtures";
import authoredMetadata from "./PrivateCaseConversation.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
} from "../../contracts/StockContract.types";
/** Public authored retrieval descriptors. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Explicit indexed default translation paths. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["people", 0, "label"],
  ["people", 1, "label"],
  ["people", 2, "label"],
  ["requestLabel"],
  ["roomLabels", "meeting"],
  ["roomLabels", "waiting"],
  ["copy", "acknowledgement"],
  ["copy", "hold"],
  ["copy", "example"],
];
/** Complete fictional binding. */
export const bindingExamples: StockContract<
  typeof DEFAULT_INPUT
>["bindingExamples"] = [
  {
    sourceText: {
      id: "motionAtlas.private-case-conversation.binding",
      message:
        "In this fictional assessment, the participant requests a private conversation and their chosen supporter waits nearby while the worker listens.",
    },
    input: DEFAULT_INPUT,
  },
];
