import { parseCssPixels } from "../../../../src/videoTheme/parseCssPixels/parseCssPixels";
import {
  VIDEO_FONT_IDS,
  VIDEO_FONT_REGISTRY,
} from "../../../../src/videoTheme/videoFontRegistry/videoFontRegistryHelpers";
import type {
  ShadowValue,
  VideoThemeDocument,
} from "../../../../src/videoTheme/videoTheme.types";

type Shades = readonly string[];
type Surfaces = Readonly<
  Record<"body" | "raised" | "overlay" | "sunken" | "panelHeader", string>
>;
type SizeScale = Readonly<Record<(typeof SIZE_KEYS)[number], string>>;

/** The `other.video.atomic` fragment the Avandar theme document writes. */
type AvandarAtomicTokens = {
  swatch: Record<string, string>;
  shadow: Record<string, ShadowValue>;
  easing: Record<"out" | "inOut" | "outBack", readonly number[]>;
};

/** The Avandar theme values `readTheme.ts --for-video` prints. */
export type AvandarThemeSource = Readonly<{
  primary: Shades;
  neutral: Shades;
  secondary: Shades;
  success: Shades;
  warning: Shades;
  danger: Shades;
  info: Shades;
  brand: string;
  surfaces: Readonly<{ light: Surfaces; dark: Surfaces }>;
  radius: SizeScale;
  borders: Readonly<
    Record<
      "light" | "dark",
      Readonly<Record<"default" | "strong" | "focus", string>>
    >
  >;
  shadows: SizeScale;
  easing: Readonly<Record<string, string>>;
  overlay: Readonly<{ backgroundColor: string }>;
  fontFamily: string;
}>;

/**
 * Avandar's dark-mode primary shade (8) is tuned for filled controls under
 * white text. As a stage accent on Avandar's navy ground it falls below 3:1,
 * so the dark accent keeps shade 4.
 */
const AVANDAR_DARK_ACCENT_SHADE = 4;
const SIZE_KEYS = ["xs", "sm", "md", "lg", "xl"] as const;
const CSS_COLOR_PATTERN =
  /^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)\s*(?:[,/]\s*([\d.]+%?))?\s*\)$/;
const SHADOW_LAYER_PATTERN =
  /^(-?[\d.]+)(?:px)? (-?[\d.]+)(?:px)? ([\d.]+)(?:px)?(?: (-?[\d.]+)(?:px)?)? (rgba?\(.+\))$/;

function _byte(value: number): string {
  return Math.round(value).toString(16).padStart(2, "0");
}

/** The opaque hex and the alpha of a CSS rgb() or rgba() colour. */
function _parseCssColor(
  color: string,
): Readonly<{ hex: string; alpha: number }> {
  const match = CSS_COLOR_PATTERN.exec(color);
  if (!match) {
    throw new Error(`Unsupported colour ${color}`);
  }
  const alphaText = match[4];
  return {
    hex: `#${[match[1], match[2], match[3]]
      .map((channel) => {
        return _byte(Number(channel));
      })
      .join("")}`,
    alpha:
      alphaText === undefined
        ? 1
        : alphaText.endsWith("%")
          ? Number(alphaText.slice(0, -1)) / 100
          : Number(alphaText),
  };
}

/**
 * A hex colour, with alpha when it is not opaque, from a CSS rgb() or rgba()
 * colour.
 */
export function getHexFromCssColor(color: string): string {
  if (/^#[0-9a-f]{6}(?:[0-9a-f]{2})?$/i.test(color)) {
    return color.toLowerCase();
  }
  const { hex, alpha } = _parseCssColor(color);
  return alpha === 1 ? hex : `${hex}${_byte(alpha * 255)}`;
}

/**
 * Layers and their shared colour from a CSS box-shadow such as Avandar's
 * stacked shadows.
 */
export function getShadowFromCss(
  css: string,
): Readonly<{ shadow: ShadowValue; color: string }> {
  const layers = css.split(/,(?![^(]*\))/).map((layer) => {
    const match = SHADOW_LAYER_PATTERN.exec(layer.trim());
    if (!match) {
      throw new Error(`Unsupported shadow layer ${layer}`);
    }
    const { hex, alpha } = _parseCssColor(match[5]);
    return {
      color: hex,
      layer: {
        offsetX: Number(match[1]),
        offsetY: Number(match[2]),
        blur: Number(match[3]),
        spread: Number(match[4] ?? 0),
        alpha,
      },
    };
  });
  const colors = new Set(
    layers.map(({ color }) => {
      return color;
    }),
  );
  if (colors.size !== 1) {
    throw new Error(`Shadow layers use more than one colour: ${css}`);
  }
  return {
    color: layers[0].color,
    shadow: {
      layers: layers.map(({ layer }) => {
        return layer;
      }),
    },
  };
}

function _cubicBezier(css: string): readonly number[] {
  const match = /^cubic-bezier\(([^)]+)\)$/.exec(css);
  if (!match) {
    throw new Error(`Unsupported easing ${css}`);
  }
  return match[1].split(",").map(Number);
}

function _fontStack(fontFamily: string): string {
  const face = fontFamily.split(",")[0].trim().replace(/['"]/g, "");
  const id = VIDEO_FONT_IDS.find((fontId) => {
    return VIDEO_FONT_REGISTRY[fontId].label === face;
  });
  if (!id) {
    throw new Error(
      `The Avandar font ${face} is not in the video font registry`,
    );
  }
  return VIDEO_FONT_REGISTRY[id].stack;
}

function _swatches(source: AvandarThemeSource, shadowColor: string) {
  return {
    ground: source.surfaces.dark.body,
    surface: source.surfaces.dark.raised,
    elevated: source.surfaces.dark.overlay,
    line: getHexFromCssColor(source.borders.dark.default),
    muted: source.neutral[3],
    text: source.neutral[0],
    textDark: source.neutral[9],
    mint: source.success[4],
    cyan: source.info[4],
    orange: source.secondary[5],
    productBackdrop: source.surfaces.light.body,
    scrim: getHexFromCssColor(source.overlay.backgroundColor),
    shadow: shadowColor,
  };
}

/**
 * The video theme's swatch, shadow, and easing tokens from the product
 * theme.
 */
function _createAtomicTokens(
  source: Readonly<AvandarThemeSource>,
  shadows: ReadonlyArray<
    readonly [string, ReturnType<typeof getShadowFromCss>]
  >,
): AvandarAtomicTokens {
  return {
    swatch: _swatches(source, shadows[0][1].color),
    shadow: Object.fromEntries(
      shadows.map(([key, { shadow }]) => {
        return [key, shadow];
      }),
    ),
    easing: {
      out: _cubicBezier(source.easing.out),
      inOut: _cubicBezier(source.easing.inOut),
      outBack: _cubicBezier(source.easing.pop),
    },
  };
}

/**
 * `avandar.theme.json`: classic's semantics mapped onto the Avandar palette,
 * surfaces, radii, shadows, font, and easing. Swatches map by meaning: the
 * ground is Avandar's dark body, the line is its dark hairline border, and
 * mint, cyan, and orange become its success, info, and secondary colours.
 */
export function createAvandarTheme(
  source: AvandarThemeSource,
): VideoThemeDocument {
  const shadows = SIZE_KEYS.map((key) => {
    return [key, getShadowFromCss(source.shadows[key])] as const;
  });
  const stack = _fontStack(source.fontFamily);
  return {
    schemaVersion: 1,
    id: "avandar",
    label: "Avandar",
    extends: "classic",
    colors: {
      primary: source.primary,
      neutral: source.neutral,
      secondary: source.secondary,
      success: source.success,
      warning: source.warning,
      danger: source.danger,
      info: source.info,
    },
    primaryShade: {
      light: source.primary.indexOf(source.brand),
      dark: AVANDAR_DARK_ACCENT_SHADE,
    },
    fontFamily: stack,
    headings: { fontFamily: stack },
    radius: Object.fromEntries(
      SIZE_KEYS.map((key) => {
        return [key, `${parseCssPixels(source.radius[key])}px`];
      }),
    ),
    other: { video: { atomic: _createAtomicTokens(source, shadows) } },
  };
}
