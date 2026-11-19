/**
 * The shade a zone's measure maps to: the opacity of an empty zone and how
 * much a full domain adds. The map and its legend key share it, so a shade
 * reads the same value in both. Both draw it through the theme's wash scale,
 * like any tint.
 */
export const ZONE_SHADE = { empty: 0.12, range: 0.76 } as const;

/** The opacity a zone shade has at a fraction of its measure's domain. */
export function getZoneShadeFromFraction(fraction: number): number {
  return ZONE_SHADE.empty + ZONE_SHADE.range * fraction;
}
