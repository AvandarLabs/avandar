import { makeLegacyContractFromDefinition } from "../legacy/makeLegacyContractFromDefinition";
import { EVENT_BUS_DEFAULT_INPUT, eventBusFixtures } from "./EventBus.fixtures";
import {
  eventBusMetadata,
  EVENT_BUS_DEFAULT_TEXT_PATHS,
} from "./EventBus.metadata";
import { eventBusInputSchema } from "./EventBus.schema";
import type { StockContract } from "../../contracts/StockContract.types";

/** Versioned content, editor controls and valid complete bindings. */
export const eventBusContract: StockContract<typeof EVENT_BUS_DEFAULT_INPUT> =
  makeLegacyContractFromDefinition({
    id: "event-bus",
    inputSchema: eventBusInputSchema,
    defaultInput: EVENT_BUS_DEFAULT_INPUT,
    fixtures: eventBusFixtures,
    metadata: eventBusMetadata,
    defaultTextPaths: EVENT_BUS_DEFAULT_TEXT_PATHS,
    semanticRules: [],
  });
