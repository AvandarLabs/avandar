import type { ResolvedVideoSemantic } from "../../../videoTheme/videoTheme.types";

/**
 * The same four place colors identify map outlines, request and team legends:
 * the accent, two categorical swatches, and the text colour.
 */
export function getCoordinationPlaceColorFromIndex({
  index,
  accent,
  color,
}: Readonly<{
  index: number;
  accent: string;
  color: ResolvedVideoSemantic["color"];
}>): string {
  return [accent, color.categorical[2], color.categorical[3], color.text][
    index
  ];
}
