import type { StockContract } from "../../contracts/StockContract.types";
import type { BarRaceInput } from "./BarRace.schema";

/** Complete fictional example used only when input is omitted. */
export const barRaceDefaultInput: BarRaceInput = {
  bars: [
    {
      label: "Alpha",
      start: 42,
      end: 86,
      from: 2,
      to: 0,
      color: "$color.positive",
    },
    {
      label: "Beta",
      start: 68,
      end: 72,
      from: 0,
      to: 1,
      color: "$color.accentAlt",
    },
    {
      label: "Gamma",
      start: 34,
      end: 58,
      from: 3,
      to: 2,
      color: "$color.highlight",
    },
    {
      label: "Delta",
      start: 53,
      end: 41,
      from: 1,
      to: 3,
      color: "$color.inactive",
    },
  ],
  heading: "Four series, one scale",
  showLegend: true,
};

/** The maximum supported collection density in the authored layout. */
export const barRaceDenseInput: BarRaceInput = { ...barRaceDefaultInput };

/** A complete smaller or differently selected authored example. */
export const barRaceChangedInput: BarRaceInput = {
  ...barRaceDefaultInput,
  bars: [
    {
      label: "Authored",
      start: 10,
      end: 25,
      from: 0,
      to: 0,
      color: "$color.accentAlt",
    },
  ],
  heading: "One supplied bar",
  showLegend: false,
};

/** Named examples available to editors and semantic regression checks. */
export const barRaceFixtures: StockContract<
  typeof barRaceDefaultInput
>["fixtures"] = [
  { id: "default", input: barRaceDefaultInput },
  { id: "dense", input: barRaceDenseInput },
  { id: "changed", input: barRaceChangedInput },
];
