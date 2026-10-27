import { makeLegacyContractFromDefinition } from "../legacy/makeLegacyContractFromDefinition";
import {
  STATUS_CYCLE_DEFAULT_INPUT,
  statusCycleFixtures,
} from "./StatusCycle.fixtures";
import {
  statusCycleMetadata,
  STATUS_CYCLE_DEFAULT_TEXT_PATHS,
} from "./StatusCycle.metadata";
import { statusCycleInputSchema } from "./StatusCycle.schema";
import type { StockContract } from "../../contracts/StockContract.types";

/** Versioned content, editor controls and valid complete bindings. */
export const statusCycleContract: StockContract<
  typeof STATUS_CYCLE_DEFAULT_INPUT
> = makeLegacyContractFromDefinition({
  id: "status-cycle",
  inputSchema: statusCycleInputSchema,
  defaultInput: STATUS_CYCLE_DEFAULT_INPUT,
  fixtures: statusCycleFixtures,
  metadata: statusCycleMetadata,
  defaultTextPaths: STATUS_CYCLE_DEFAULT_TEXT_PATHS,
  semanticRules: [
    {
      id: "ordered-state-times",
      paths: ["states.*.at"],
      description: "State arrival times increase by at least twelve frames.",
    },
  ],
});
