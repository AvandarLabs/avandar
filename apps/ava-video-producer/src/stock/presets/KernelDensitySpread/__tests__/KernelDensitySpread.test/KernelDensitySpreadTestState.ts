import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { getSvgAttributeMatchesFromMarkup } from "../../../../../../tests/helpers/getSvgAttributeMatchesFromMarkup/getSvgAttributeMatchesFromMarkup";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { KernelDensitySpread } from "../../KernelDensitySpread";
import {
  DEFAULT_INPUT,
  CHANGED_INPUT,
  fixtures,
} from "../../KernelDensitySpread.fixtures";
import { type Input } from "../../KernelDensitySpread.schema";

function _assertIntensityGradient(markup: string): void {
  const gradient = markup.match(
    /<linearGradient[^>]*>([\s\S]*?)<\/linearGradient>/,
  );
  assert.ok(gradient, "Intensity legend contains a graded scale");
  const stops = [...gradient[1].matchAll(/stop-opacity="([^"]*)"/g)].map(
    (match) => {
      return Number(match[1]);
    },
  );
  assert.equal(stops[0], 0);
  assert.equal(stops.at(-1), 1);
  assert.match(markup, /fill="url\(#/);
}

type AssertRadiiPhysicallyWidenOrNarrowRRRROptions = Readonly<{
  input: Input;
  initial: ReturnType<typeof _tags>;
  middle: ReturnType<typeof _tags>;
  final: ReturnType<typeof _tags>;
}>;

function _assertCellCenterIntensityIsTheSumDataCellIntensityDataCellIntensity(
  input: Input,
): void {
  assert.ok(
    Math.abs(
      Number(
        _values({
          markup: _render({ frame: 150, input: input }),
          attribute: "data-cell-intensity",
        })[8],
      ) - 1.25,
    ) < 1e-12,
  );
}

function _assertCellCenterIntensityIsTheSumDataCellIntensity({
  tags,
  input,
}: Readonly<{ tags: ReturnType<typeof _tags>; input: Input }>): void {
  tags.forEach((tag, index) => {
    const x = (((index % 6) + 0.5) * 100) / 6,
      y = ((Math.floor(index / 6) + 0.5) * 100) / 6;
    const expected =
      2.5 * Math.max(0, 1 - Math.hypot(x - 25, y - 25) / (100 / 3));
    assert.ok(
      Math.abs(
        Number(
          _values({
            markup: _render({ frame: 150, input: input }),
            attribute: "data-cell-intensity",
          })[index],
        ) - expected,
      ) < 1e-12,
    );
    assert.ok(
      Math.abs(
        SvgAttributes.getNumberFromMarkup({
          attributes: tag,
          name: "fill-opacity",
        }) -
          expected / input.legendMaximum,
      ) < 1e-12,
    );
  });
}

function _assertRadiiPhysicallyWidenOrNarrowDataKernelBoundary(): void {
  [DEFAULT_INPUT, CHANGED_INPUT, fixtures[2].input].forEach((input) => {
    const initial = _tags({
        markup: _render({ frame: 105, input: input }),
        attribute: "data-kernel-boundary",
      }),
      middle = _tags({
        markup: _render({ frame: 122, input: input }),
        attribute: "data-kernel-boundary",
      }),
      final = _tags({
        markup: _render({ frame: 150, input: { ...input, showKernels: true } }),
        attribute: "data-kernel-boundary",
      });
    assert.equal(final.length, input.points.length);
    assert.deepEqual(
      _values({
        markup: _render({ frame: 105, input: input }),
        attribute: "data-point-position",
      }),
      _values({
        markup: _render({ frame: 150, input: input }),
        attribute: "data-point-position",
      }),
    );
    assert.deepEqual(
      _values({
        markup: _render({ frame: 105, input: input }),
        attribute: "data-legend-maximum",
      }),
      [String(input.legendMaximum)],
    );
    assert.deepEqual(
      _values({
        markup: _render({ frame: 150, input: input }),
        attribute: "data-legend-maximum",
      }),
      [String(input.legendMaximum)],
    );
    _assertRadiiPhysicallyWidenOrNarrowRRRR({ input, initial, middle, final });
  });
}

function _assertRadiiPhysicallyWidenOrNarrowRRRR({
  input,
  initial,
  middle,
  final,
}: AssertRadiiPhysicallyWidenOrNarrowRRRROptions): void {
  if (input.showKernels) {
    assert.notEqual(
      SvgAttributes.getNumberFromMarkup({
        attributes: initial[0],
        name: "r",
      }),
      SvgAttributes.getNumberFromMarkup({ attributes: middle[0], name: "r" }),
    );
    assert.notEqual(
      SvgAttributes.getNumberFromMarkup({ attributes: middle[0], name: "r" }),
      SvgAttributes.getNumberFromMarkup({ attributes: final[0], name: "r" }),
    );
  }
}

function _render({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: Input }>): string {
  return renderToStaticMarkup(
    createElement(
      "svg",
      {},
      createElement(KernelDensitySpread, {
        frame,
        input,
        accent: "#3caeff",
        id: "packet30",
      }),
    ),
  );
}

function _values({
  markup,
  attribute,
}: {
  markup: string;
  attribute: string;
}): string[] {
  return getSvgAttributeMatchesFromMarkup({ markup, attribute }).values;
}

function _tags({
  markup,
  attribute,
}: {
  markup: string;
  attribute: string;
}): string[] {
  return getSvgAttributeMatchesFromMarkup({ markup, attribute }).tags;
}

function _getVisibleTexts({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>): string[] {
  return Object.values(input.labels);
}

const EXCLUSIONS: string[] = [
  "id",
  "fromId",
  "toId",
  "originId",
  "policy",
  "values",
];
/** Shared data and assertions for the KernelDensitySpread tests. */
export const KernelDensitySpreadTestState = {
  /** Asserts the intensity legend uses a full-range opacity gradient. */
  assertIntensityGradient: _assertIntensityGradient,
  /** Asserts the selected test cell retains the expected summed intensity. */
  assertCellCenterIntensityIsTheSumDataCellIntensityDataCellIntensity:
    _assertCellCenterIntensityIsTheSumDataCellIntensityDataCellIntensity,
  /** Asserts each cell intensity and opacity match its kernel contribution. */
  assertCellCenterIntensityIsTheSumDataCellIntensity:
    _assertCellCenterIntensityIsTheSumDataCellIntensity,
  /**
   * Asserts kernel boundaries change with radius while points and scale stay
   * fixed.
   */
  assertRadiiPhysicallyWidenOrNarrowDataKernelBoundary:
    _assertRadiiPhysicallyWidenOrNarrowDataKernelBoundary,
  /** Renders the selected kernel-density frame as SVG markup. */
  render: _render,
  /** Returns values of a marked attribute from rendered SVG markup. */
  values: _values,
  /** Returns SVG elements carrying a marked attribute. */
  tags: _tags,
  /** Returns the authored labels expected in kernel-density renders. */
  getVisibleTexts: _getVisibleTexts,
  /** Fixture values excluded from required rendered label assertions. */
  EXCLUSIONS,
};
