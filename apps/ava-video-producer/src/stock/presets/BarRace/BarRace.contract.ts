import { makeLegacyContractFromDefinition } from "../legacy/makeLegacyContractFromDefinition";
import { barRaceDefaultInput, barRaceFixtures } from "./BarRace.fixtures";
import {
  barRaceMetadata,
  BAR_RACE_DEFAULT_TEXT_PATHS,
} from "./BarRace.metadata";
import { barRaceInputSchema } from "./BarRace.schema";
import type { StockContract } from "../../contracts/StockContract.types";

/** Versioned content, editor controls and valid complete bindings. */
export const barRaceContract: StockContract<typeof barRaceDefaultInput> =
  makeLegacyContractFromDefinition({
    id: "bar-race",
    inputSchema: barRaceInputSchema,
    defaultInput: barRaceDefaultInput,
    fixtures: barRaceFixtures,
    metadata: barRaceMetadata,
    defaultTextPaths: BAR_RACE_DEFAULT_TEXT_PATHS,
    semanticRules: [
      {
        id: "unique-period-ranks",
        paths: ["bars.*.from", "bars.*.to"],
        description:
          "Each period contains one distinct rank per authored bar, bounded by the collection length.",
      },
    ],
  });
