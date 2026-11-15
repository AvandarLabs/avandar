import { makeLegacyContractFromDefinition } from "../legacy/makeLegacyContractFromDefinition";
import {
  SCAN_LINES_DEFAULT_INPUT,
  scanLinesFixtures,
} from "./ScanLines.fixtures";
import {
  scanLinesMetadata,
  SCAN_LINES_DEFAULT_TEXT_PATHS,
} from "./ScanLines.metadata";
import { scanLinesInputSchema } from "./ScanLines.schema";
import type { StockContract } from "../../contracts/StockContract.types";

/** Versioned content, editor controls and valid complete bindings. */
export const scanLinesContract: StockContract<typeof SCAN_LINES_DEFAULT_INPUT> =
  makeLegacyContractFromDefinition({
    id: "scan-lines",
    inputSchema: scanLinesInputSchema,
    defaultInput: SCAN_LINES_DEFAULT_INPUT,
    fixtures: scanLinesFixtures,
    metadata: scanLinesMetadata,
    defaultTextPaths: SCAN_LINES_DEFAULT_TEXT_PATHS,
    semanticRules: [],
  });
