import { controls } from "./PdfGridReconstruction.controls";
import { DEFAULT_INPUT, fixtures } from "./PdfGridReconstruction.fixtures";
import { METADATA } from "./PdfGridReconstruction.metadata";
import {
  inputSchema,
  jsonSchema,
  SEMANTIC_RULES,
  type Input,
} from "./PdfGridReconstruction.schema";
import type { StockContract } from "../../contracts/StockContract.types";
/** Complete typed renderer-free contract. */
export const pdfGridReconstructionContract = {
  id: "pdf-grid-reconstruction",
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
    ["grid", "columnLabels", 0],
    ["grid", "columnLabels", 1],
    ["evidenceLabel"],
    ["copy", "context"],
    ["copy", "source"],
    ["copy", "result"],
  ],
  bindingExamples: [
    {
      sourceText: {
        id: "motionAtlas.pdf-grid-reconstruction.bindingExamples.0.sourceText",
        message:
          "The page has columns Site and Items, with West 12 and East 8. Ruling lines define the four data cells, which copy into the extracted table without changing order.",
      },
      input: DEFAULT_INPUT,
    },
  ],
} satisfies StockContract<Input>;
