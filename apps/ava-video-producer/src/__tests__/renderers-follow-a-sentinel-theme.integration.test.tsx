/** @jsxRuntime automatic */
/*
 * Renderers follow the theme even where a literal hides in a constant. Each
 * item renders under a sentinel theme that moves every swatch, palette
 * shade, stroke width, radius, dash step, opacity step, type step, weight,
 * tracking step, and multiplier to an improbable value, and its markup must
 * then hold none of their `classic` values. The pattern scan in
 * `renderers-draw-no-literals` cannot see a literal routed through a
 * constant; this test can. It covers the stock primitives, the graphic
 * primitives, and all 170 stock presets, at their default input and at
 * every other fixture their contract declares. The sentinel theme and the
 * checks live in `tests/helpers/SentinelVideoTheme.ts`, shared with the
 * film, fixed-composition, and helper sentinel tests.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { propNotEq } from "@avandar/utils";
import { renderToStaticMarkup } from "react-dom/server";
import { SentinelVideoTheme } from "../../tests/helpers/SentinelVideoTheme/SentinelVideoTheme";
import { Card } from "../stock/graphics-common/Card";
import { Check } from "../stock/graphics-common/Check";
import { CircleNode } from "../stock/graphics-common/CircleNode/CircleNode";
import { DrawPath } from "../stock/graphics-common/DrawPath";
import { Glyph } from "../stock/graphics-common/Glyph";
import { Guide } from "../stock/graphics-common/Guide";
import { Packet } from "../stock/graphics-common/Packet/Packet";
import { Panel } from "../stock/graphics-common/Panel";
import { Pill } from "../stock/graphics-common/Pill";
import { Route } from "../stock/graphics-common/Route";
import { Rule } from "../stock/graphics-common/Rule";
import { DocumentFragment } from "../stock/primitives/DocumentFragment/DocumentFragment";
import { MembershipMarker } from "../stock/primitives/MembershipMarker/MembershipMarker";
import { ObjectGlyph } from "../stock/primitives/ObjectGlyph/ObjectGlyph";
import { PersonGlyph } from "../stock/primitives/PersonGlyph/PersonGlyph";
import { QuantityBand } from "../stock/primitives/QuantityBand/QuantityBand";
import { RoutePath } from "../stock/primitives/RoutePath/RoutePath";
import { TableCell } from "../stock/primitives/TableCell/TableCell";
import { stockContracts } from "../stock/registry/stockContracts";
import { STOCK_IDS } from "../stock/stockEntry";
import { StockGraphic } from "../stock/StockGraphic/StockGraphic";
import { VideoThemeScope } from "../videoTheme/VideoThemeScope/VideoThemeScope";
import type { StockRequest } from "../stock/contracts/StockContract.types";
import type { ReactNode } from "react";

const SAMPLE_FRAMES = [0, 45, 90, 135, 178];
/** Frames a non-default fixture is checked at: mid-build and settled. */
const FIXTURE_FRAMES = [90, 178];
/**
 * Presets that lay a sentence out word by word at a size measured against
 * glyph widths. Their text size is content, so it is not a finding.
 */
const MEASURED_SENTENCE_PRESETS: ReadonlySet<string> = new Set([
  "prose-measurement-ledger",
  "utterance-to-model-draft",
]);
/** The colour the test draws content with, so content is never flagged. */
const CONTENT_COLOR = "#5a5b5c";
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
test("the sentinel detector reports classic color, stroke, typography, and opacity values", () => {
  assert.deepEqual(
    SentinelVideoTheme.findClassicValuesInMarkup({
      markup:
        '<rect stroke="#2a404e" stroke-width="2" rx="12" stroke-dasharray="3 4" opacity="0.5"/><text font-size="29" font-weight="600">a</text><text font-size="16"><tspan>b</tspan></text>',
    }),
    [
      "#2a404e",
      "stroke-width 2",
      "rx 12",
      "dash 3 4",
      "font-weight 600",
      "font-size 29",
      "opacity 0.5",
    ],
  );
});
test("stock and graphic primitives draw no classic value under the sentinel theme", () => {
  assert.deepEqual(
    Object.entries(PRIMITIVES).flatMap(([name, element]) => {
      const markup = renderToStaticMarkup(
        <VideoThemeScope patches={[SentinelVideoTheme.SENTINEL_THEME]}>
          <svg>{element}</svg>
        </VideoThemeScope>,
      );
      return SentinelVideoTheme.findClassicValuesInMarkup({ markup }).map(
        (value) => {
          return `${name}: ${value}`;
        },
      );
    }),
    [],
  );
});
/** The sentinel findings of one stock request over some frames. */
function _stockFindings({
  request,
  frames,
}: Readonly<{
  request: StockRequest;
  frames: readonly number[];
}>): string[] {
  return SentinelVideoTheme.findClassicValuesAcrossFrames({
    frames,
    render: (frame) => {
      return renderToStaticMarkup(
        <VideoThemeScope patches={[SentinelVideoTheme.SENTINEL_THEME]}>
          <StockGraphic {...request} frame={frame} />
        </VideoThemeScope>,
      );
    },
  }).filter((value) => {
    return (
      !MEASURED_SENTENCE_PRESETS.has(request.preset) ||
      !value.startsWith("font-size ")
    );
  });
}
test("every stock preset draws no classic value under the sentinel theme", () => {
  assert.deepEqual(
    STOCK_IDS.flatMap((preset) => {
      return _stockFindings({
        request: { preset } as StockRequest,
        frames: SAMPLE_FRAMES,
      }).map((value) => {
        return `${preset}: ${value}`;
      });
    }),
    [],
  );
});
test("every non-default stock fixture draws no classic value under the sentinel theme", () => {
  assert.deepEqual(
    STOCK_IDS.flatMap((preset) => {
      return stockContracts[preset].fixtures
        .filter(propNotEq("id", "default"))
        .flatMap((fixture) => {
          // TypeScript cannot pair a preset id with its own input type
          // across the 170-preset union.
          const request = { preset, input: fixture.input } as StockRequest;
          return _stockFindings({ request, frames: FIXTURE_FRAMES }).map(
            (value) => {
              return `${preset} ${fixture.id}: ${value}`;
            },
          );
        });
    }),
    [],
  );
});
