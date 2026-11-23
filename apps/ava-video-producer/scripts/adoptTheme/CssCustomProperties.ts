import type { Palette, ThemePalettes } from "./adoptTheme.types";

type CssBlock = {
  selector: string;
  body: string;
};
function _stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}
/**
 * The index just past the `}` that closes the block whose `{` is at
 * `openBraceIndex`.
 */
function _findBlockEnd({
  css,
  openBraceIndex,
}: Readonly<{
  css: string;
  openBraceIndex: number;
}>): number {
  let depth = 0;
  const offset = [...css.slice(openBraceIndex)].findIndex((character) => {
    if (character === "{") {
      depth += 1;
    } else if (character === "}") {
      depth -= 1;
    }
    return depth === 0;
  });
  return offset < 0 ? css.length : openBraceIndex + offset + 1;
}
/**
 * Flat list of `{ selector, body }` with braces matched, so an `@media` block
 * is returned whole instead of being cut at its first inner `}`.
 */
function _splitBlocks({
  css,
  start = 0,
}: Readonly<{
  css: string;
  start?: number;
}>): CssBlock[] {
  const openBraceIndex = css.indexOf("{", start);
  if (openBraceIndex === -1) {
    return [];
  }
  const selector = css
    .slice(start, openBraceIndex)
    .trim()
    .split(/[\n;]/)
    .pop()
    ?.trim();
  const end = _findBlockEnd({
    css,
    openBraceIndex,
  });
  return [
    { selector: selector ?? "", body: css.slice(openBraceIndex + 1, end - 1) },
    ..._splitBlocks({
      css,
      start: end,
    }),
  ];
}
/** Custom properties declared directly in a block, ignoring nested ones. */
function _readDeclarations(body: string): Palette {
  const topLevelBody = body.replace(/\{[\s\S]*?\}/g, "");
  return Object.fromEntries(
    Array.from(topLevelBody.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g), (match) => {
      return [match[1], match[2].trim()];
    }),
  );
}
function _isSelfReference({
  name,
  value,
}: Readonly<{
  name: string;
  value: string;
}>): boolean {
  return new RegExp(`^var\\(\\s*${name}\\s*[,)]`).test(value.trim());
}
/**
 * A copy of `target` with the declarations merged in, refusing the one shape
 * that silently destroys a palette. Tailwind 4 re-exports a theme with
 * `@theme inline { --x: var(--x) }` so utilities can reach it; that block
 * usually sits below the real definitions, and a plain spread lets the
 * self-reference overwrite the colour with a pointer at itself. A concrete
 * value always beats a pointer.
 */
function _mergeDeclarations({
  target,
  incoming,
}: Readonly<{
  target: Readonly<Palette>;
  incoming: Readonly<Palette>;
}>): Palette {
  return {
    ...target,
    ...Object.fromEntries(
      Object.entries(incoming).filter(([name, value]) => {
        return (
          !_isSelfReference({
            name,
            value,
          }) || !target[name]
        );
      }),
    ),
  };
}
function _isRoot(selector: string): boolean {
  return (
    /(^|,)\s*(:root|html|@theme[\w\s]*)\s*(,|$)/.test(selector) ||
    selector.startsWith("@theme")
  );
}
function _isDark(selector: string): boolean {
  return (
    /\.dark\b/.test(selector) ||
    /\[data-theme=["']?dark/.test(selector) ||
    /prefers-color-scheme:\s*dark/.test(selector)
  );
}
/** A copy of `palettes` with `incoming` merged into the dark or light one. */
function _mergeIntoPalettes(
  options: Readonly<{
    palettes: Readonly<ThemePalettes>;
    isDarkTarget: boolean;
    incoming: Readonly<Palette>;
  }>,
): ThemePalettes {
  const { palettes, isDarkTarget, incoming } = options;
  return isDarkTarget
    ? {
        ...palettes,
        dark: _mergeDeclarations({
          target: palettes.dark,
          incoming,
        }),
      }
    : {
        ...palettes,
        light: _mergeDeclarations({
          target: palettes.light,
          incoming,
        }),
      };
}
/** Reads an at-rule block such as `@media` or `@theme` into the palettes. */
function _collectAtRule(
  options: Readonly<{
    block: CssBlock;
    palettes: Readonly<ThemePalettes>;
  }>,
): ThemePalettes {
  const { block, palettes } = options;
  const themePalettes = block.selector.startsWith("@theme")
    ? _mergeIntoPalettes({
        palettes,
        isDarkTarget: _isDark(block.selector),
        incoming: _readDeclarations(block.body),
      })
    : palettes;
  return _splitBlocks({ css: block.body })
    .filter((inner) => {
      return _isRoot(inner.selector) || _isDark(inner.selector);
    })
    .reduce((current, inner) => {
      return _mergeIntoPalettes({
        palettes: current,
        isDarkTarget: _isDark(block.selector) || _isDark(inner.selector),
        incoming: _readDeclarations(inner.body),
      });
    }, themePalettes);
}
/** The palettes after reading one top-level block into them. */
function _collectBlock(
  palettes: Readonly<ThemePalettes>,
  block: CssBlock,
): ThemePalettes {
  if (block.selector.startsWith("@")) {
    return _collectAtRule({ block, palettes });
  }
  const isDarkBlock = _isDark(block.selector);
  return isDarkBlock || _isRoot(block.selector)
    ? _mergeIntoPalettes({
        palettes,
        isDarkTarget: isDarkBlock,
        incoming: _readDeclarations(block.body),
      })
    : palettes;
}
/**
 * Every light and dark custom property declared at `:root`, `html`, or
 * `@theme`, following Tailwind's `.dark`, `[data-theme]`, and media-query
 * forms. adopt-theme reads a product stylesheet's palette with it.
 */
function _getCustomPropertiesFromCss(css: string): ThemePalettes {
  return _splitBlocks({ css: _stripComments(css) }).reduce<ThemePalettes>(
    _collectBlock,
    { light: {}, dark: {} },
  );
}
/** Replaces `var()` pointers in place for one pass; true when any changed. */
function _inlinePointersOnce({
  palette,
  fallback,
}: Readonly<{
  palette: Palette;
  fallback: Readonly<Palette>;
}>): boolean {
  return Object.keys(palette).reduce((hasChanged, name) => {
    const value = palette[name];
    const match = /^var\((--[\w-]+)(?:\s*,\s*([^)]+))?\)$/.exec(value.trim());
    const target = match
      ? (palette[match[1]] ?? fallback[match[1]] ?? match[2])
      : undefined;
    if (target && target !== value) {
      palette[name] = target.trim();
      return true;
    }
    return hasChanged;
  }, false);
}
/**
 * A copy of the palette with `var(--x)` pointers replaced by the values they
 * point at, within the palette or `fallback`, over up to four passes.
 * Tailwind 4 aliases half a theme this way, and the kit needs colours, not
 * pointers at properties its own stylesheet does not define.
 */
function _makeInlinedPaletteFromPalette({
  palette,
  fallback = {},
}: Readonly<{
  palette: Readonly<Palette>;
  fallback?: Readonly<Palette>;
}>): Palette {
  const inlined = { ...palette };
  // Stop at the first pass that changes nothing.
  [0, 1, 2, 3].every(() => {
    return _inlinePointersOnce({
      palette: inlined,
      fallback,
    });
  });
  return inlined;
}

/** Reads and expands CSS custom properties for product palette adoption. */
export const CssCustomProperties = {
  /**
   * Every light and dark custom property declared at `:root`, `html`, or
   * `@theme`, following Tailwind's `.dark`, `[data-theme]`, and media-query
   * forms.
   */
  getCustomPropertiesFromCss: _getCustomPropertiesFromCss,
  /**
   * A copy of the palette with `var(--x)` pointers replaced by the values they
   * point at, within the palette or `fallback`, over up to four passes.
   */
  makeInlinedPaletteFromPalette: _makeInlinedPaletteFromPalette,
};
