/** @jsxRuntime automatic */
/*
 * Renderers follow the theme even where a literal hides in a constant. Each
 * item renders under a sentinel theme that moves every swatch, palette
 * shade, stroke width, radius, dash step, opacity step, and multiplier to an
 * improbable value, and its markup must then hold none of their `classic`
 * values. The pattern scan in
 * `renderers-draw-no-literals` cannot see a literal routed through a
 * constant; this test can. It covers the stock primitives, the graphic
 * primitives, and all 170 stock presets. The sentinel theme and the checks
 * live in `tests/helpers/sentinelVideoTheme.ts`, shared with the composition,
 * film, fixed-composition, and helper sentinel tests.
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
import { VideoThemeScope } from "../../../src/videoTheme/VideoThemeScope/VideoThemeScope";
import {
  findClassicValuesAcrossFrames,
  findClassicValuesInMarkup,
  SENTINEL_THEME,
} from "../../../tests/helpers/sentinelVideoTheme";
import type { StockRequest } from "../../../src/stock/contracts/StockContract.types";
import type { ReactNode } from "react";

const SAMPLE_FRAMES = [0, 45, 90, 135, 178];
/** The colour the test draws content with, so content is never flagged. */
const CONTENT_COLOR = "#5a5b5c";

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

test("the sentinel theme moves the values the test looks for", () => {
  assert.deepEqual(
    findClassicValuesInMarkup(
      '<rect stroke="#2a404e" stroke-width="2" rx="12" stroke-dasharray="3 4" opacity="0.5"/>',
    ),
    ["#2a404e", "stroke-width 2", "rx 12", "dash 3 4", "opacity 0.5"],
  );
});

test("stock and graphic primitives draw no classic value under the sentinel theme", () => {
  assert.deepEqual(
    Object.entries(PRIMITIVES).flatMap(([name, element]) => {
      const markup = _renderSentinel(element);
      return findClassicValuesInMarkup(markup).map((value) => {
        return `${name}: ${value}`;
      });
    }),
    [],
  );
});

test("every stock preset draws no classic value under the sentinel theme", () => {
  assert.deepEqual(
    STOCK_IDS.flatMap((preset) => {
      return findClassicValuesAcrossFrames({
        frames: SAMPLE_FRAMES,
        render: (frame) => {
          return renderToStaticMarkup(
            <VideoThemeScope patches={[SENTINEL_THEME]}>
              <StockGraphic {...({ preset } as StockRequest)} frame={frame} />
            </VideoThemeScope>,
          );
        },
      }).map((value) => {
        return `${preset}: ${value}`;
      });
    }),
    [],
  );
});
