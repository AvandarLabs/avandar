import { _render } from "./SavedSeedSeasonReturnTestHelpers";
/** Rendered setup state consumed by the corresponding assertions. */
export type MakeCultivatorHandsTouchActualFrameFromFrameResult = {
  markup: ReturnType<typeof _render>;
  hand: string;
  band: string;
  widths: number[];
};

/** Authored quantities and independent material-balance expectations. */
export type MaterialCase = {
  harvestQuantity: number;
  reservedQuantity: number;
  storageLossQuantity: number;
  sownQuantity: number;
  current: number;
  remaining: number;
};
