import type { VideoThemePatch } from "../videoTheme.types";

type StockColors = Readonly<{ accent?: string; background?: string }>;

function _colorParts(colors: StockColors) {
  return {
    swatch: {
      ...(colors.accent ? { accent: colors.accent } : {}),
      ...(colors.background ? { ground: colors.background } : {}),
    },
    semantic: colors.accent
      ? { color: { accent: "$atomic.swatch.accent" } }
      : {},
  };
}

/**
 * A patch that applies a stock request's explicit `accent` and `background`
 * props: each picked hex becomes a swatch (`swatch.accent`, `swatch.ground`)
 * and the accent role points at it. Used by `StockGraphic`, so a colour in
 * content or a CLI request wins over the surrounding theme.
 */
export function createThemePatchFromStockColors(
  colors: StockColors,
): VideoThemePatch {
  const { swatch, semantic } = _colorParts(colors);
  return { other: { video: { atomic: { swatch }, semantic } } };
}
