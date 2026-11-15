import { STOCK } from "../../stockPalette";
import type { StockContract } from "../../contracts/StockContract.types";
import type { OrbitalSystemInput } from "./OrbitalSystem.schema";

/** Complete fictional example used only when input is omitted. */
export const orbitalSystemDefaultInput: OrbitalSystemInput = {
  bodies: [
    { rx: 294, ry: 122, angle: -24, color: "accent", phase: 0, label: "ALPHA" },
    {
      rx: 294,
      ry: 122,
      angle: 24,
      color: STOCK.cyan,
      phase: 58,
      label: "BETA",
    },
    {
      rx: 185,
      ry: 185,
      angle: 0,
      color: STOCK.orange,
      phase: 112,
      label: "GAMMA",
    },
  ],
  showOrbits: true,
};

/** The maximum supported collection density in the authored layout. */
export const orbitalSystemDenseInput: OrbitalSystemInput = {
  ...orbitalSystemDefaultInput,
};

/** A complete smaller or differently selected authored example. */
export const orbitalSystemChangedInput: OrbitalSystemInput = {
  ...orbitalSystemDefaultInput,
  bodies: [
    { ...orbitalSystemDefaultInput.bodies[0], label: "RELAY", phase: 30 },
  ],
  showOrbits: false,
};

/** Named examples available to editors and semantic regression checks. */
export const orbitalSystemFixtures: StockContract<
  typeof orbitalSystemDefaultInput
>["fixtures"] = [
  { id: "default", input: orbitalSystemDefaultInput },
  { id: "dense", input: orbitalSystemDenseInput },
  { id: "changed", input: orbitalSystemChangedInput },
];
