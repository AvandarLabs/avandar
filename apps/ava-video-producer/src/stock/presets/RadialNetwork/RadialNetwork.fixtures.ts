import type { RadialNetworkInput } from "./RadialNetwork.schema";

/** Complete fictional example used only when input is omitted. */
export const RADIAL_NETWORK_DEFAULT_INPUT: RadialNetworkInput = {
  hub: { label: "Connect", detail: "ONE SYSTEM" },
  spokes: [
    "Input",
    "Parse",
    "Match",
    "Model",
    "Store",
    "Query",
    "Route",
    "Sync",
  ],
  showOrbit: true,
};

/** The maximum supported collection density in the authored layout. */
export const radialNetworkDenseInput: RadialNetworkInput = {
  ...RADIAL_NETWORK_DEFAULT_INPUT,
};

/** A complete smaller or differently selected authored example. */
export const radialNetworkChangedInput: RadialNetworkInput = {
  ...RADIAL_NETWORK_DEFAULT_INPUT,
  hub: { label: "Link", detail: "AUTHORED HUB" },
  spokes: ["Intake", "Review"],
  showOrbit: false,
};

/** Named examples available to editors and semantic regression checks. */
export const radialNetworkFixtures: Array<{
  id: string;
  input: {
    hub: { label: string; detail: string };
    spokes: string[];
    showOrbit: boolean;
  };
}> = [
  { id: "default", input: RADIAL_NETWORK_DEFAULT_INPUT },
  { id: "dense", input: radialNetworkDenseInput },
  { id: "changed", input: radialNetworkChangedInput },
];
