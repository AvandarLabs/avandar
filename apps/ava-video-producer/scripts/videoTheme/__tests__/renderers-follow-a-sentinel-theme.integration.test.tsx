/** @jsxRuntime automatic */
/*
 * Renderers follow the theme even where a literal hides in a constant. Each
 * covered item renders under a sentinel theme that moves every swatch,
 * palette shade, stroke width, radius, and multiplier to an improbable
 * value, and its markup must then hold no `classic` swatch, no `classic`
 * stroke width, and no `classic` radius. The pattern scan in
 * `renderers-draw-no-literals` cannot see a literal routed through a
 * constant; this test can. Covered items are the stock primitives, the
 * graphic primitives, and every stock preset a slice budget lists in
 * `coveredIds`.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { STOCK_IDS } from "../../../src/stock/catalog";
import { Card } from "../../../src/stock/graphics-common/Card";
import { Check } from "../../../src/stock/graphics-common/Check";
import { CircleNode } from "../../../src/stock/graphics-common/CircleNode";
import { DrawPath } from "../../../src/stock/graphics-common/DrawPath";
import { Glyph } from "../../../src/stock/graphics-common/Glyph";
import { Guide } from "../../../src/stock/graphics-common/Guide";
import { Packet } from "../../../src/stock/graphics-common/Packet";
import { Panel } from "../../../src/stock/graphics-common/Panel";
import { Pill } from "../../../src/stock/graphics-common/Pill";
import { Route } from "../../../src/stock/graphics-common/Route";
import { Rule } from "../../../src/stock/graphics-common/Rule";
import { DocumentFragment } from "../../../src/stock/primitives/DocumentFragment/DocumentFragment";
import { MembershipMarker } from "../../../src/stock/primitives/MembershipMarker/MembershipMarker";
import { ObjectGlyph } from "../../../src/stock/primitives/ObjectGlyph/ObjectGlyph";
import { PersonGlyph } from "../../../src/stock/primitives/PersonGlyph/PersonGlyph";
import { QuantityBand } from "../../../src/stock/primitives/QuantityBand/QuantityBand";
import { RoutePath } from "../../../src/stock/primitives/RoutePath/RoutePath";
import { TableCell } from "../../../src/stock/primitives/TableCell/TableCell";
import { StockGraphic } from "../../../src/stock/StockGraphic/StockGraphic";
import { BUILT_IN_VIDEO_THEMES } from "../../../src/videoTheme/builtInVideoThemes/builtInVideoThemes";
import { getValueAtPath } from "../../../src/videoTheme/getValueAtPath";
import { VideoThemeScope } from "../../../src/videoTheme/VideoThemeScope/VideoThemeScope";
import { getCoveredIdsFromBudgets } from "../themeLiteralBudgets/themeLiteralBudgets";
import type { StockRequest } from "../../../src/stock/contracts/StockContract.types";
import type { VideoThemePatch } from "../../../src/videoTheme/videoTheme.types";
import type { ReactNode } from "react";

const CLASSIC = BUILT_IN_VIDEO_THEMES.get("classic");
const SAMPLE_FRAMES = [0, 45, 90, 135, 179];
/** Picked so no product of a sentinel and a classic constant is classic. */
const SENTINEL_STROKE = 0.7;
const SENTINEL_RADIUS = 7;
const SENTINEL_MULTIPLIER = 1.37;
/** The colour the test draws content with, so content is never flagged. */
const CONTENT_COLOR = "#5a5b5c";

function _record(path: readonly string[]): Readonly<Record<string, unknown>> {
  const value = getValueAtPath(CLASSIC, path);
  return typeof value === "object" && value !== null
    ? (value as Readonly<Record<string, unknown>>)
    : {};
}

function _sentinelColor(index: number): string {
  return `#${(0x3a1f00 + index * 7).toString(16).padStart(6, "0")}`;
}

/** Every classic swatch and palette shade, lowercased. */
const CLASSIC_COLORS = new Set(
  [
    ...Object.values(_record(["other", "video", "atomic", "swatch"])),
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
const CLASSIC_STROKES = new Set(
  Object.values(_record(["other", "video", "atomic", "strokeWidth"])).map(
    String,
  ),
);
const CLASSIC_RADII = new Set(
  Object.values(_record(["radius"])).map((value) => {
    return String(value).replace("px", "");
  }),
);

function _mapKeys(
  path: readonly string[],
  value: (index: number) => unknown,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.keys(_record(path)).map((key, index) => {
      return [key, value(index)];
    }),
  );
}

const SENTINEL_THEME: VideoThemePatch = {
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
  other: {
    video: {
      atomic: {
        swatch: _mapKeys(["other", "video", "atomic", "swatch"], (index) => {
          return _sentinelColor(index);
        }),
        strokeWidth: _mapKeys(
          ["other", "video", "atomic", "strokeWidth"],
          () => {
            return SENTINEL_STROKE;
          },
        ),
        multiplier: { identity: SENTINEL_MULTIPLIER },
      },
    },
  },
};

/** The classic values a markup string still holds, one line each. */
function _findClassicValues(markup: string): string[] {
  const colors = [...markup.matchAll(/#[0-9a-fA-F]{3,8}\b/g)]
    .map(([color]) => {
      return color.toLowerCase();
    })
    .filter((color) => {
      return CLASSIC_COLORS.has(color);
    });
  const strokes = [...markup.matchAll(/stroke-width="([\d.]+)"/g)]
    .map(([, width]) => {
      return width;
    })
    .filter((width) => {
      return CLASSIC_STROKES.has(width);
    });
  const radii = [...markup.matchAll(/\brx="([\d.]+)"/g)]
    .map(([, radius]) => {
      return radius;
    })
    .filter((radius) => {
      return CLASSIC_RADII.has(radius);
    });
  return [
    ...new Set([
      ...colors,
      ...strokes.map((width) => {
        return `stroke-width ${width}`;
      }),
      ...radii.map((radius) => {
        return `rx ${radius}`;
      }),
    ]),
  ];
}

function _renderSentinel(children: ReactNode): string {
  return renderToStaticMarkup(
    <VideoThemeScope patches={[SENTINEL_THEME]}>
      <svg>{children}</svg>
    </VideoThemeScope>,
  );
}

const PRIMITIVES: Readonly<Record<string, ReactNode>> = {
  DocumentFragment: (
    <>
      <DocumentFragment x={0} y={0} width={200} text="a" emphasized />
      <DocumentFragment x={0} y={0} width={200} text="a" />
    </>
  ),
  MembershipMarker: (
    <>
      <MembershipMarker x={0} y={0} membership="included" />
      <MembershipMarker x={0} y={0} membership="unknown" />
    </>
  ),
  ObjectGlyph: <ObjectGlyph kind="box" x={0} y={0} />,
  PersonGlyph: <PersonGlyph x={0} y={0} role="worker" />,
  QuantityBand: (
    <QuantityBand
      values={[{ value: 1, color: CONTENT_COLOR }]}
      denominator={2}
      x={0}
      y={0}
      width={10}
      height={10}
    />
  ),
  RoutePath: (
    <RoutePath
      points={[
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ]}
      progress={0.5}
    />
  ),
  TableCell: (
    <>
      <TableCell x={0} y={0} width={200} text="a" highlighted />
      <TableCell x={0} y={0} width={200} text="a" />
    </>
  ),
  Card: <Card x={0} y={0} width={100} height={50} color={CONTENT_COLOR} />,
  Check: <Check x={10} y={10} color={CONTENT_COLOR} size={20} />,
  CircleNode: (
    <CircleNode x={5} y={5} label="n" frame={40} accent={CONTENT_COLOR} />
  ),
  DrawPath: <DrawPath d="M0 0 L10 10" frame={40} />,
  Glyph: <Glyph d="M0 0 L10 10" color={CONTENT_COLOR} />,
  Guide: <Guide cx={10} cy={10} rx={20} ry={10} />,
  Packet: (
    <Packet
      frame={40}
      from={{ x: 0, y: 0 }}
      to={{ x: 100, y: 10 }}
      color={CONTENT_COLOR}
    />
  ),
  Panel: <Panel x={0} y={0} width={100} height={50} />,
  Pill: <Pill x={0} y={0} text="pill" color={CONTENT_COLOR} width={80} />,
  Route: (
    <Route
      from={{ x: 0, y: 0 }}
      to={{ x: 10, y: 10 }}
      progress={1}
      frame={40}
      at={0}
      color={CONTENT_COLOR}
    />
  ),
  Rule: <Rule x1={0} x2={100} y={5} />,
};

// Covered ids are Atlas ids; only stock preset ids render as stock graphics.
const COVERED_PRESETS = getCoveredIdsFromBudgets().filter((id) => {
  return (STOCK_IDS as readonly string[]).includes(id);
});

test("the sentinel theme moves every value the test looks for", () => {
  assert.ok(CLASSIC_COLORS.size > 20 && CLASSIC_STROKES.has("2"));
  assert.ok(CLASSIC_RADII.has("12"));
});

test("stock and graphic primitives draw no classic value under the sentinel theme", () => {
  assert.deepEqual(
    Object.entries(PRIMITIVES).flatMap(([name, element]) => {
      return _findClassicValues(_renderSentinel(element)).map((value) => {
        return `${name}: ${value}`;
      });
    }),
    [],
  );
});

test("covered stock presets draw no classic value under the sentinel theme", () => {
  assert.deepEqual(
    COVERED_PRESETS.flatMap((preset) => {
      const markup = SAMPLE_FRAMES.map((frame) => {
        return renderToStaticMarkup(
          <VideoThemeScope patches={[SENTINEL_THEME]}>
            <StockGraphic {...({ preset } as StockRequest)} frame={frame} />
          </VideoThemeScope>,
        );
      }).join("");
      return _findClassicValues(markup).map((value) => {
        return `${preset}: ${value}`;
      });
    }),
    [],
  );
});
