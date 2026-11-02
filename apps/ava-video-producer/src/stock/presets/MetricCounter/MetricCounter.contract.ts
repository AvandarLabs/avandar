import { makeLegacyContractFromDefinition } from "../legacy/makeLegacyContractFromDefinition";
import {
  METRIC_COUNTER_DEFAULT_INPUT,
  metricCounterFixtures,
} from "./MetricCounter.fixtures";
import {
  metricCounterMetadata,
  METRIC_COUNTER_DEFAULT_TEXT_PATHS,
} from "./MetricCounter.metadata";
import { metricCounterInputSchema } from "./MetricCounter.schema";
import type { StockContract } from "../../contracts/StockContract.types";

/** Versioned content, editor controls and valid complete bindings. */
export const metricCounterContract: StockContract<
  typeof METRIC_COUNTER_DEFAULT_INPUT
> = makeLegacyContractFromDefinition({
  id: "metric-counter",
  inputSchema: metricCounterInputSchema,
  defaultInput: METRIC_COUNTER_DEFAULT_INPUT,
  fixtures: metricCounterFixtures,
  metadata: metricCounterMetadata,
  defaultTextPaths: METRIC_COUNTER_DEFAULT_TEXT_PATHS,
  semanticRules: [],
});
