import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./ChargeReferenceAlignment.fixtures";
import authoredMetadata from "./ChargeReferenceAlignment.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
} from "../../contracts/StockContract.types";
export { CONTROLS as controls } from "./ChargeReferenceAlignment.controls";
/** Public retrieval copy without private provenance. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Explicit indexed paths for visible default copy. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["invoice", "procedureCode"],
  ["invoice", "providerKey"],
  ["invoice", "payerKey"],
  ["invoice", "periodLabel"],
  ["reference", "procedureCode"],
  ["reference", "providerKey"],
  ["reference", "payerKey"],
  ["reference", "periodLabel"],
  ["reference", "sourceLabel"],
  ["money", "currencyLabel"],
  ["copy", "invoice"],
  ["copy", "reference"],
  ["copy", "procedure"],
  ["copy", "provider"],
  ["copy", "payer"],
  ["copy", "period"],
  ["copy", "quantity"],
  ["copy", "matched"],
  ["copy", "unmatched"],
  ["copy", "difference"],
  ["copy", "review"],
  ["copy", "example"],
];
/** Complete fictional authored binding. */
export const bindingExamples: StockContract<
  typeof DEFAULT_INPUT
>["bindingExamples"] = [
  {
    sourceText: {
      id: "motionAtlas.charge-reference-alignment.bindingExamples.0.sourceText",
      message:
        "A fictional billed line for DEMO-P1 at Demo clinic A under Demo plan Q in Demo period A is 84 demo credits for one unit. A separately supplied reference for the same context is 60 demo credits. The illustration exposes a 24-credit difference for review, without deciding what is owed.",
    },
    input: DEFAULT_INPUT,
  },
];
