import type { HelperEntry } from "../helperCatalog.types";

/** What every helper preview receives from the live player. */
export type HelperDemoProps = {
  frame: number;
  frames: number;
  helper: HelperEntry;
};
