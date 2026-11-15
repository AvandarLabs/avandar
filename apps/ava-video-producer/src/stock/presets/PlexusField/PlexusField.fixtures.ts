import type { StockContract } from "../../contracts/StockContract.types";
import type { PlexusFieldInput } from "./PlexusField.schema";

/** Complete fictional example used only when input is omitted. */
export const PLEXUS_FIELD_DEFAULT_INPUT: PlexusFieldInput = {
  particleCount: 46,
  seed: 0,
  heading: "A field of possibilities",
  showConnections: true,
};

/** The maximum supported collection density in the authored layout. */
export const plexusFieldDenseInput: PlexusFieldInput = {
  ...PLEXUS_FIELD_DEFAULT_INPUT,
  particleCount: 64,
  seed: 65535,
};

/** A complete smaller or differently selected authored example. */
export const plexusFieldChangedInput: PlexusFieldInput = {
  ...PLEXUS_FIELD_DEFAULT_INPUT,
  particleCount: 12,
  seed: 17,
  heading: "An authored field",
  showConnections: false,
};

/** Named examples available to editors and semantic regression checks. */
export const plexusFieldFixtures: StockContract<
  typeof PLEXUS_FIELD_DEFAULT_INPUT
>["fixtures"] = [
  { id: "default", input: PLEXUS_FIELD_DEFAULT_INPUT },
  { id: "dense", input: plexusFieldDenseInput },
  { id: "changed", input: plexusFieldChangedInput },
];
