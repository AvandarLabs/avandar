import { parseStockMetadata } from "../../contracts/parseStockMetadata/parseStockMetadata";
import { DEFAULT_INPUT } from "./KernelDensitySpread.fixtures";
import authoredMetadata from "./KernelDensitySpread.metadata.yaml";
import type {
  StockContract,
  StockMetadata,
} from "../../contracts/StockContract.types";
/** Public retrieval copy and explicit limits. */
export const METADATA: StockMetadata = parseStockMetadata(authoredMetadata);
/** Explicit authored default prose paths. */
export const DEFAULT_TEXT_PATHS: Array<Array<string | number>> = [
  ["labels", "radius"],
  ["labels", "intensity"],
  ["labels", "unit"],
  ["labels", "points"],
];
/** Complete accepted fictional binding. */
export const bindingExamples: StockContract<
  typeof DEFAULT_INPUT
>["bindingExamples"] = [
  {
    sourceText: {
      id: "motionAtlas.kernel-density-spread.bindingExample",
      message:
        "Spread three unit-weight points using cone kernels. Increase radius from 15 to 30 grid units while keeping the same points and fixed intensity legend maximum 5.",
    },
    input: DEFAULT_INPUT,
  },
];
