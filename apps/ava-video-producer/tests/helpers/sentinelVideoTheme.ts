import { BUILT_IN_VIDEO_THEMES } from "../../src/videoTheme/builtInVideoThemes/builtInVideoThemes";
import { getValueAtPath } from "../../src/videoTheme/getValueAtPath";
import type { VideoThemePatch } from "../../src/videoTheme/videoTheme.types";

/*
 * The sentinel theme the "follow a sentinel theme" tests render every Atlas
 * item under. It moves every swatch, palette shade, white, black, radius,
 * stroke width, dash step, opacity step, glow opacity, type scale step, font
 * weight, tracking step, and the identity multiplier to an improbable value.
 * A renderer that reads the theme then draws no `classic` value, so any
 * `classic` value left in its markup is a literal, even one routed through a
 * constant the pattern scan cannot see.
 */

const CLASSIC = BUILT_IN_VIDEO_THEMES.get("classic");
/** Picked so no product of a sentinel and a classic constant is classic. */
const SENTINEL_STROKE = 0.7;
const SENTINEL_RADIUS = 7;
const SENTINEL_MULTIPLIER = 1.37;
const SENTINEL_DASH = [1.7, 2.3];
const SENTINEL_OPACITY = 0.4321;
const SENTINEL_FONT_SIZE = "41px";
const SENTINEL_FONT_WEIGHT = 900;
const SENTINEL_TRACKING = 0.315;

function _record(path: readonly string[]): Readonly<Record<string, unknown>> {
  const value = getValueAtPath(CLASSIC, path);
  return typeof value === "object" && value !== null
    ? (value as Readonly<Record<string, unknown>>)
    : {};
}

function _sentinelColor(index: number): string {
  return `#${(0x3a1f00 + index * 7).toString(16).padStart(6, "0")}`;
}

function _mapKeys(
  path: readonly string[],
  value: (key: string, index: number) => unknown,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.keys(_record(path)).map((key, index) => {
      return [key, value(key, index)];
    }),
  );
}

const ATOMIC = ["other", "video", "atomic"];

/** The patch every sentinel test renders under. */
export const SENTINEL_THEME: VideoThemePatch = {
  colors: Object.fromEntries(
    Object.keys(_record(["colors"])).map((name, paletteIndex) => {
      return [
        name,
        Array.from({ length: 10 }, (_, shade) => {
          return _sentinelColor(100 + paletteIndex * 10 + shade);
        }),
      ];
    }),
  ),
  white: _sentinelColor(200),
  black: _sentinelColor(201),
  defaultGradient: {
    from: _sentinelColor(202),
    to: _sentinelColor(203),
    deg: 180,
  },
  radius: _mapKeys(["radius"], () => {
    return `${SENTINEL_RADIUS}px`;
  }),
  fontSizes: _mapKeys(["fontSizes"], () => {
    return SENTINEL_FONT_SIZE;
  }),
  headings: {
    fontWeight: String(SENTINEL_FONT_WEIGHT),
    sizes: _mapKeys(["headings", "sizes"], () => {
      return {
        fontSize: SENTINEL_FONT_SIZE,
        fontWeight: String(SENTINEL_FONT_WEIGHT),
      };
    }),
  },
  other: {
    video: {
      atomic: {
        swatch: _mapKeys([...ATOMIC, "swatch"], (_, index) => {
          return _sentinelColor(index);
        }),
        strokeWidth: _mapKeys([...ATOMIC, "strokeWidth"], () => {
          return SENTINEL_STROKE;
        }),
        dash: _mapKeys([...ATOMIC, "dash"], (key) => {
          return key === "none" ? [] : SENTINEL_DASH;
        }),
        // Full opacity stays full: it means "not faded", not a style value.
        opacity: _mapKeys([...ATOMIC, "opacity"], (key) => {
          return key === "100" ? 1 : SENTINEL_OPACITY;
        }),
        glow: _mapKeys([...ATOMIC, "glow"], (key) => {
          return {
            ...(_record([...ATOMIC, "glow", key]) as object),
            opacity: SENTINEL_OPACITY,
          };
        }),
        fontWeight: _mapKeys([...ATOMIC, "fontWeight"], () => {
          return SENTINEL_FONT_WEIGHT;
        }),
        // No tracking stays none: it means "not tracked", not a style value.
        letterSpacing: _mapKeys([...ATOMIC, "letterSpacing"], (key) => {
          return key === "none" ? 0 : SENTINEL_TRACKING;
        }),
        multiplier: { identity: SENTINEL_MULTIPLIER },
      },
    },
  },
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
    ...Object.values(_record([...ATOMIC, "swatch"])),
    ...Object.values(_record(["colors"])).flat(),
    getValueAtPath(CLASSIC, ["white"]),
    getValueAtPath(CLASSIC, ["black"]),
  ]
    .filter((value): value is string => {
      return typeof value === "string";
    })
    .map((value) => {
      return value.toLowerCase();
    }),
);
const CLASSIC_STROKES: ReadonlySet<string> = new Set(
  Object.values(_record([...ATOMIC, "strokeWidth"])).map(String),
);
const CLASSIC_RADII: ReadonlySet<string> = new Set(
  Object.values(_record(["radius"])).map((value) => {
    return String(value).replace("px", "");
  }),
);
const CLASSIC_DASHES: ReadonlySet<string> = new Set(
  Object.values(_record([...ATOMIC, "dash"])).flatMap((value) => {
    return Array.isArray(value) && value.length > 0
      ? [value.join(" "), value.join(",")]
      : [];
  }),
);
/** Opacity steps below full; 1 means "not faded" and is never flagged. */
const CLASSIC_OPACITIES: ReadonlySet<string> = new Set(
  Object.values(_record([...ATOMIC, "opacity"]))
    .filter((value) => {
      return value !== 1;
    })
    .map(String),
);

/** Type scale steps in pixels. */
const CLASSIC_FONT_SIZES: ReadonlySet<string> = new Set(
  Object.values(_record(["fontSizes"])).map((value) => {
    return String(value).replace("px", "");
  }),
);
const CLASSIC_FONT_WEIGHTS: ReadonlySet<string> = new Set(
  Object.values(_record([...ATOMIC, "fontWeight"])).map(String),
);
/** Tracking steps other than none, as em in CSS. */
const CLASSIC_TRACKING = Object.values(
  _record([...ATOMIC, "letterSpacing"]),
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

function _matches(
  markup: string,
  pattern: RegExp,
  classic: ReadonlySet<string>,
  label: (value: string, match: string) => string,
): string[] {
  return [...markup.matchAll(pattern)].flatMap((match) => {
    const value = match[match.length - 1]!;
    return classic.has(value) ? [label(value, match[0])] : [];
  });
}

/**
 * The classic values a markup string still holds, one line each: colours,
 * SVG and CSS stroke widths, radii, dash steps, opacity steps, font weights,
 * tracking, and type sizes on SVG text. Text whose first child is a
 * `<tspan>` is `FitText` or a measured layout, whose size is content
 * checked against glyph widths, so its size is not flagged.
 */
export function findClassicValuesInMarkup(
  markup: string,
  checks: SentinelChecks = {},
): string[] {
  const colors = new Set([
    ...CLASSIC_COLORS,
    ..._hexStrings(checks.extraColors).map((color) => {
      return color.toLowerCase();
    }),
  ]);
  return [
    ...new Set([
      ..._matches(markup.toLowerCase(), /#[0-9a-f]{3,8}\b/g, colors, (v) => {
        return v;
      }),
      ..._matches(markup, /stroke-width="([\d.]+)"/g, CLASSIC_STROKES, (v) => {
        return `stroke-width ${v}`;
      }),
      ..._matches(markup, /\brx="([\d.]+)"/g, CLASSIC_RADII, (v) => {
        return `rx ${v}`;
      }),
      ..._matches(
        markup,
        /border-radius:([\d.]+)px/g,
        CLASSIC_RADII,
        (_, m) => {
          return m;
        },
      ),
      ..._matches(
        markup,
        /border(?:-\w+)?:([\d.]+)px/g,
        CLASSIC_STROKES,
        (_, m) => {
          return m;
        },
      ),
      ..._matches(
        markup,
        /stroke-dasharray="([^"]+)"/g,
        CLASSIC_DASHES,
        (v) => {
          return `dash ${v}`;
        },
      ),
      ..._matches(
        markup,
        /\bfont-weight(?:="|:)(\d+)/g,
        CLASSIC_FONT_WEIGHTS,
        (v) => {
          return `font-weight ${v}`;
        },
      ),
      ..._matches(
        markup,
        /\bletter-spacing="(-?[\d.]+)"/g,
        CLASSIC_TRACKING_PIXELS,
        (v) => {
          return `letter-spacing ${v}`;
        },
      ),
      ..._matches(
        markup,
        /\bletter-spacing:(-?[\d.]+)em/g,
        CLASSIC_TRACKING_EMS,
        (v) => {
          return `letter-spacing ${v}em`;
        },
      ),
      ..._matches(
        markup,
        /<text\b[^>]*?\sfont-size="([\d.]+)"[^>]*>(?!<tspan)/g,
        CLASSIC_FONT_SIZES,
        (v) => {
          return `font-size ${v}`;
        },
      ),
      ..._matches(
        markup,
        /\b((?:fill-|stroke-)?opacity)(?:="|:)([\d.]+)/g,
        CLASSIC_OPACITIES,
        (v, m) => {
          return `${m.split(/[=:]/)[0]} ${v}`;
        },
      ),
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
export function findClassicValuesAcrossFrames(
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
        const findings = findClassicValuesInMarkup(render(frame), checks);
        if (!findings.some(_isOpacityFinding)) {
          return findings;
        }
        const next = new Set(
          findClassicValuesInMarkup(render(frame + 1), checks),
        );
        return findings.filter((finding) => {
          return !_isOpacityFinding(finding) || next.has(finding);
        });
      }),
    ),
  ];
}
