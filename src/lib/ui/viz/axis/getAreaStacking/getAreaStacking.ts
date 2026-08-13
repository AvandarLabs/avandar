import { matchLiteral } from "@avandar/utils";
import type { AreaChartVizConfig } from "$/models/vizs/AreaChartVizConfig/AreaChartVizConfig.types";

/**
 * The single stack id every area shares when its layout stacks. Named
 * so the extent calculation and the `<Area>` element cannot drift.
 */
export const AREA_STACK_ID = "1";

/**
 * The area chart's layout modes, taken from the persisted config so the
 * two cannot drift.
 */
export type AreaLayout = AreaChartVizConfig["layout"];

/** How an area layout stacks, as far as the value extent is concerned. */
export type AreaStacking = {
  isPercent: boolean;
  sharedStackId: string | undefined;
};

/** Returns the percentage mode and shared stack identifier for a layout. */
export function getAreaStacking(layout: AreaLayout): AreaStacking {
  return matchLiteral(layout, {
    default: { isPercent: false, sharedStackId: undefined },
    stacked: { isPercent: false, sharedStackId: AREA_STACK_ID },
    percent: { isPercent: true, sharedStackId: AREA_STACK_ID },
    split: { isPercent: false, sharedStackId: AREA_STACK_ID },
  });
}
