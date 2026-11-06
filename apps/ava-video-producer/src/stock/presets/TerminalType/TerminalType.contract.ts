import { makeLegacyContractFromDefinition } from "../legacy/makeLegacyContractFromDefinition";
import {
  TERMINAL_TYPE_DEFAULT_INPUT,
  terminalTypeFixtures,
} from "./TerminalType.fixtures";
import {
  terminalTypeMetadata,
  TERMINAL_TYPE_DEFAULT_TEXT_PATHS,
} from "./TerminalType.metadata";
import { terminalTypeInputSchema } from "./TerminalType.schema";
import type { StockContract } from "../../contracts/StockContract.types";

/** Versioned content, editor controls and valid complete bindings. */
export const terminalTypeContract: StockContract<
  typeof TERMINAL_TYPE_DEFAULT_INPUT
> = makeLegacyContractFromDefinition({
  id: "terminal-type",
  inputSchema: terminalTypeInputSchema,
  defaultInput: TERMINAL_TYPE_DEFAULT_INPUT,
  fixtures: terminalTypeFixtures,
  metadata: terminalTypeMetadata,
  defaultTextPaths: TERMINAL_TYPE_DEFAULT_TEXT_PATHS,
  semanticRules: [],
});
