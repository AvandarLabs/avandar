/** Custom property names mapped to their declared values, as `--x: value`. */
export type Palette = Record<string, string>;

/** The light and dark palettes read from one product stylesheet. */
export type ThemePalettes = { light: Palette; dark: Palette };

/** One report row: the kit token, the source property, and what happened. */
export type TokenReportRow = [
  kitToken: string,
  source: string,
  outcome: string,
];

/** A named cubic-bezier easing found in the source palette. */
export type SourceEasing = { name: string; controlPoints: number[] };

/** A product custom property value and the property name it came from. */
export type AliasHit = { value: string; from: string };
