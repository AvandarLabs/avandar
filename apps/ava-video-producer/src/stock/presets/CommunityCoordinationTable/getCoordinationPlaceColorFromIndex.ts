import { STOCK } from "../../stockPalette";
/**
 * The same four place colors identify map outlines, request and team legends.
 */
export function getCoordinationPlaceColorFromIndex({
  index,
  accent,
}: Readonly<{ index: number; accent: string }>): string {
  return [accent, STOCK.cyan, STOCK.orange, STOCK.text][index];
}
