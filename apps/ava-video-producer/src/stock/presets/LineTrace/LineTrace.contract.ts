import { makeLegacyContractFromDefinition } from "../legacy/makeLegacyContractFromDefinition";
import {
  LINE_TRACE_DEFAULT_INPUT,
  lineTraceFixtures,
} from "./LineTrace.fixtures";
import {
  lineTraceMetadata,
  LINE_TRACE_DEFAULT_TEXT_PATHS,
} from "./LineTrace.metadata";
import { lineTraceInputSchema } from "./LineTrace.schema";
import type { StockContract } from "../../contracts/StockContract.types";

/** Versioned content, editor controls and valid complete bindings. */
export const lineTraceContract: StockContract<typeof LINE_TRACE_DEFAULT_INPUT> =
  makeLegacyContractFromDefinition({
    id: "line-trace",
    inputSchema: lineTraceInputSchema,
    defaultInput: LINE_TRACE_DEFAULT_INPUT,
    fixtures: lineTraceFixtures,
    metadata: lineTraceMetadata,
    defaultTextPaths: LINE_TRACE_DEFAULT_TEXT_PATHS,
    semanticRules: [
      {
        id: "aligned-samples",
        paths: ["points", "reference"],
        description:
          "The reference and primary series have equal sample counts.",
      },
    ],
  });
