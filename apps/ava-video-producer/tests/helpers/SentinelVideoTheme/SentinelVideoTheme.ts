import { getValueAtPath } from "../../../src/videoTheme/getValueAtPath";
import { SentinelThemeData } from "./SentinelThemeData";

type MatchesOptions = {
  markup: string;
  pattern: RegExp;
  classic: ReadonlySet<string>;
  label: (value: string, match: string) => string;
};
function _hexStrings(value: unknown): string[] {
  if (typeof value === "string") {
    return /^#[0-9a-fA-F]{3,8}$/.test(value) ? [value] : [];
  }
  return typeof value === "object" && value !== null
    ? Object.values(value).flatMap(_hexStrings)
    : [];
}
const CLASSIC_COLORS: ReadonlySet<string> = new Set(
  [
    ...Object.values(
      SentinelThemeData.record([...SentinelThemeData.ATOMIC, "swatch"]),
    ),
    ...Object.values(SentinelThemeData.record(["colors"])).flat(),
    getValueAtPath({
      source: SentinelThemeData.CLASSIC,
      path: ["white"],
    }),
    getValueAtPath({
      source: SentinelThemeData.CLASSIC,
      path: ["black"],
    }),
  ]
    .filter((value): value is string => {
      return typeof value === "string";
    })
    .map((value) => {
      return value.toLowerCase();
    }),
);
const CLASSIC_STROKES: ReadonlySet<string> = new Set(
  Object.values(
    SentinelThemeData.record([...SentinelThemeData.ATOMIC, "strokeWidth"]),
  ).map(String),
);
const CLASSIC_RADII: ReadonlySet<string> = new Set(
  Object.values(SentinelThemeData.record(["radius"])).map((value) => {
    return String(value).replace("px", "");
  }),
);
const CLASSIC_DASHES: ReadonlySet<string> = new Set(
  Object.values(
    SentinelThemeData.record([...SentinelThemeData.ATOMIC, "dash"]),
  ).flatMap((value) => {
    return Array.isArray(value) && value.length > 0
      ? [value.join(" "), value.join(",")]
      : [];
  }),
);
/** Opacity steps below full; 1 means "not faded" and is never flagged. */
const CLASSIC_OPACITIES: ReadonlySet<string> = new Set(
  Object.values(
    SentinelThemeData.record([...SentinelThemeData.ATOMIC, "opacity"]),
  )
    .filter((value) => {
      return value !== 1;
    })
    .map(String),
);
/** Type scale steps in pixels. */
const CLASSIC_FONT_SIZES: ReadonlySet<string> = new Set(
  Object.values(SentinelThemeData.record(["fontSizes"])).map((value) => {
    return String(value).replace("px", "");
  }),
);
const CLASSIC_FONT_WEIGHTS: ReadonlySet<string> = new Set(
  Object.values(
    SentinelThemeData.record([...SentinelThemeData.ATOMIC, "fontWeight"]),
  ).map(String),
);
/** Tracking steps other than none, as em in CSS. */
const CLASSIC_TRACKING = Object.values(
  SentinelThemeData.record([...SentinelThemeData.ATOMIC, "letterSpacing"]),
).filter((value): value is number => {
  return typeof value === "number" && value !== 0;
});
/**
 * Tracking in pixels as SVG text draws it: a classic tracking step at a
 * classic type size.
 */
const CLASSIC_TRACKING_PIXELS: ReadonlySet<string> = new Set(
  CLASSIC_TRACKING.flatMap((tracking) => {
    return [...CLASSIC_FONT_SIZES].map((size) => {
      return String(Number((tracking * Number(size)).toFixed(4)));
    });
  }),
);
const CLASSIC_TRACKING_EMS: ReadonlySet<string> = new Set(
  CLASSIC_TRACKING.map(String),
);
/** What a sentinel test checks a markup string for. */
export type SentinelChecks = Readonly<{
  /** Extra colours that count as classic, such as the product palette. */
  extraColors?: unknown;
}>;
function _matches({
  markup,
  pattern,
  classic,
  label,
}: Readonly<MatchesOptions>): string[] {
  return [...markup.matchAll(pattern)].flatMap((match) => {
    const value = match[match.length - 1]!;
    return classic.has(value) ? [label(value, match[0])] : [];
  });
}
/** Classic stroke, corner, border, and dash values in rendered markup. */
function _findClassicShapeValues(markup: string): string[] {
  return [
    ..._matches({
      markup,
      pattern: /stroke-width="([\d.]+)"/g,
      classic: CLASSIC_STROKES,
      label: (v) => {
        return `stroke-width ${v}`;
      },
    }),
    ..._matches({
      markup,
      pattern: /\brx="([\d.]+)"/g,
      classic: CLASSIC_RADII,
      label: (v) => {
        return `rx ${v}`;
      },
    }),
    ..._matches({
      markup,
      pattern: /border-radius:([\d.]+)px/g,
      classic: CLASSIC_RADII,
      label: (_, m) => {
        return m;
      },
    }),
    ..._matches({
      markup,
      pattern: /border(?:-\w+)?:([\d.]+)px/g,
      classic: CLASSIC_STROKES,
      label: (_, m) => {
        return m;
      },
    }),
    ..._matches({
      markup,
      pattern: /stroke-dasharray="([^"]+)"/g,
      classic: CLASSIC_DASHES,
      label: (v) => {
        return `dash ${v}`;
      },
    }),
  ];
}
/** Classic weight, tracking, size, and opacity values in rendered markup. */
function _findClassicTypeValues(markup: string): string[] {
  return [
    ..._matches({
      markup,
      pattern: /\bfont-weight(?:="|:)(\d+)/g,
      classic: CLASSIC_FONT_WEIGHTS,
      label: (v) => {
        return `font-weight ${v}`;
      },
    }),
    ..._matches({
      markup,
      pattern: /\bletter-spacing="(-?[\d.]+)"/g,
      classic: CLASSIC_TRACKING_PIXELS,
      label: (v) => {
        return `letter-spacing ${v}`;
      },
    }),
    ..._matches({
      markup,
      pattern: /\bletter-spacing:(-?[\d.]+)em/g,
      classic: CLASSIC_TRACKING_EMS,
      label: (v) => {
        return `letter-spacing ${v}em`;
      },
    }),
    ..._matches({
      markup,
      pattern: /<text\b[^>]*?\sfont-size="([\d.]+)"[^>]*>(?!<tspan)/g,
      classic: CLASSIC_FONT_SIZES,
      label: (v) => {
        return `font-size ${v}`;
      },
    }),
    ..._matches({
      markup,
      pattern: /\b((?:fill-|stroke-)?opacity)(?:="|:)([\d.]+)/g,
      classic: CLASSIC_OPACITIES,
      label: (v, m) => {
        return `${m.split(/[=:]/)[0]} ${v}`;
      },
    }),
  ];
}
/**
 * The classic values a markup string still holds, one line each: colours, SVG
 * and CSS stroke widths, radii, dash steps, opacity steps, font weights,
 * tracking, and type sizes on SVG text. Text whose first child is a `<tspan>`
 * is `FitText` or a measured layout, whose size is content checked against
 * glyph widths, so its size is not flagged.
 */
function _findClassicValuesInMarkup({
  markup,
  checks = {},
}: Readonly<{
  markup: string;
  checks?: SentinelChecks;
}>): string[] {
  const colors = new Set([
    ...CLASSIC_COLORS,
    ..._hexStrings(checks.extraColors).map((color) => {
      return color.toLowerCase();
    }),
  ]);
  return [
    ...new Set([
      ..._matches({
        markup: markup.toLowerCase(),
        pattern: /#[0-9a-f]{3,8}\b/g,
        classic: colors,
        label: (v) => {
          return v;
        },
      }),
      ..._findClassicShapeValues(markup),
      ..._findClassicTypeValues(markup),
    ]),
  ];
}
function _isOpacityFinding(finding: string): boolean {
  return /opacity/.test(finding);
}
/**
 * The classic values an item draws over its sample frames. An animated
 * opacity can pass through an opacity step on one frame by chance, so an
 * opacity finding counts only when the next frame holds it too: a constant
 * holds, a fade moves on.
 */
function _findClassicValuesAcrossFrames(
  options: Readonly<{
    frames: readonly number[];
    render: (frame: number) => string;
    checks?: SentinelChecks;
  }>,
): string[] {
  const { frames, render, checks } = options;
  return [
    ...new Set(
      frames.flatMap((frame) => {
        const findings = _findClassicValuesInMarkup({
          markup: render(frame),
          checks,
        });
        if (!findings.some(_isOpacityFinding)) {
          return findings;
        }
        const nextFrameFindings = new Set(
          _findClassicValuesInMarkup({ markup: render(frame + 1), checks }),
        );
        return findings.filter((finding) => {
          return !_isOpacityFinding(finding) || nextFrameFindings.has(finding);
        });
      }),
    ),
  ];
}
/** Finds classic theme values still present in sentinel-rendered samples. */
export const SentinelVideoTheme = {
  /**
   * The classic values a markup string still holds, one line each: colours,
   * SVG and CSS stroke widths, radii, dash steps, opacity steps, font
   * weights, tracking, and type sizes on SVG text. Text whose first child is
   * a `<tspan>` is `FitText` or a measured layout, whose size is content
   * checked against glyph widths, so its size is not flagged.
   */
  findClassicValuesInMarkup: _findClassicValuesInMarkup,
  /**
   * The classic values an item draws over its sample frames. An animated
   * opacity can pass through an opacity step on one frame by chance, so an
   * opacity finding counts only when the next frame holds it too: a constant
   * holds, a fade moves on.
   */
  findClassicValuesAcrossFrames: _findClassicValuesAcrossFrames,
  /** The patch every sentinel test renders under. */
  SENTINEL_THEME: SentinelThemeData.SENTINEL_THEME,
};
