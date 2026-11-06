import { controls } from "./PdfNearestLabelReview.controls";
import { DEFAULT_INPUT, fixtures } from "./PdfNearestLabelReview.fixtures";
import { METADATA } from "./PdfNearestLabelReview.metadata";
import {
  inputSchema,
  jsonSchema,
  SEMANTIC_RULES,
  type Input,
} from "./PdfNearestLabelReview.schema";
import type { StockContract } from "../../contracts/StockContract.types";
/** Complete typed renderer-free contract. */
export const pdfNearestLabelReviewContract = {
  id: "pdf-nearest-label-review",
  schemaVersion: 1,
  metadataVersion: 1,
  collection: "general",
  loopFrames: 180,
  inputSchema,
  jsonSchema,
  semanticRules: SEMANTIC_RULES,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  metadata: METADATA,
  controls,
  defaultTextPaths: [
    ["labels", 0, "text"],
    ["labels", 1, "text"],
    ["copy", "context"],
    ["copy", "source"],
    ["copy", "result"],
  ],
  bindingExamples: [
    {
      sourceText: {
        id: "motionAtlas.pdf-nearest-label-review.bindingExamples.0.sourceText",
        message:
          "The printed figure 24 lies between West area and East area. Its nearest-to-next distance ratio exceeds 0.8, so flag it; a reviewer assigns it to West area.",
      },
      input: DEFAULT_INPUT,
    },
  ],
} satisfies StockContract<Input>;
