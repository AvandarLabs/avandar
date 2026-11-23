import assert from "node:assert/strict";
import test from "node:test";
import { prop, propEq } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { registerStockDefaultTextAssertions } from "../../../../../../tests/helpers/registerStockDefaultTextAssertions";
import { registerStockPresetAssertions } from "../../../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { SvgPaintAssertions } from "../../../../../../tests/helpers/SvgPaintAssertions/SvgPaintAssertions";
import { KernelDensitySpread } from "../../KernelDensitySpread";
import { kernelDensitySpreadContract as contract } from "../../KernelDensitySpread.contract";
import {
  DEFAULT_INPUT,
  CHANGED_INPUT,
  fixtures,
  invalidInputs,
} from "../../KernelDensitySpread.fixtures";
import { inputSchema } from "../../KernelDensitySpread.schema";
import { KernelDensitySpreadTestState } from "./KernelDensitySpreadTestState";

const {
  assertIntensityGradient: _assertIntensityGradient,
  assertCellCenterIntensityIsTheSumDataCellIntensityDataCellIntensity:
    _assertCellCenterIntensityIsTheSumDataCellIntensityDataCellIntensity,
  assertCellCenterIntensityIsTheSumDataCellIntensity:
    _assertCellCenterIntensityIsTheSumDataCellIntensity,
  assertRadiiPhysicallyWidenOrNarrowDataKernelBoundary:
    _assertRadiiPhysicallyWidenOrNarrowDataKernelBoundary,
  render: _render,
  values: _values,
  tags: _tags,
  getVisibleTexts: _getVisibleTexts,
  EXCLUSIONS,
} = KernelDensitySpreadTestState;

registerStockPresetAssertions({
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  invalidInputs,
  contract,
  render: _render,
  excludedTextFields: EXCLUSIONS,
  getVisibleTexts: _getVisibleTexts,
  textFrames: [36, 150],
});

registerStockDefaultTextAssertions({
  contract,
  expectedTextPaths: [
    ["labels", "radius"],
    ["labels", "intensity"],
    ["labels", "unit"],
    ["labels", "points"],
  ],
  suppliedInputs: fixtures.map(prop("input")),
});

registerStockTextLayoutAssertions({
  inputSchema,
  fixtures,
  render: _render,
  excludedTextFields: EXCLUSIONS,
  getVisibleTexts: _getVisibleTexts,
});

test("cell-center intensity is the sum of weighted linear cones without normalization", () => {
  const input = inputSchema.parse({
    ...DEFAULT_INPUT,
    points: [
      { id: "a", x: 25, y: 25, weight: 2 },
      { id: "b", x: 25, y: 25, weight: 0.5 },
    ],
    gridSize: 6,
    radii: { initial: 100 / 6, final: 100 / 3 },
    legendMaximum: 5,
  });
  const tags = _tags({
    markup: _render({ frame: 150, input: input }),
    attribute: "data-cell-intensity",
  });
  assert.equal(tags.length, 36);
  assert.equal(
    Number(
      _values({
        markup: _render({ frame: 105, input: input }),
        attribute: "data-cell-intensity",
      })[7],
    ),
    2.5,
  );
  _assertCellCenterIntensityIsTheSumDataCellIntensityDataCellIntensity(input);
  assert.equal(
    Number(
      _values({
        markup: _render({ frame: 150, input: input }),
        attribute: "data-cell-intensity",
      })[35],
    ),
    0,
  );
  _assertCellCenterIntensityIsTheSumDataCellIntensity({ tags, input });
  assert.match(_render({ frame: 150, input: input }), /Zero modeled intensity/);
});

test("radii physically widen or narrow cones while retaining fixed points and legend", () => {
  _assertRadiiPhysicallyWidenOrNarrowDataKernelBoundary();
  assert.equal(
    _tags({
      markup: _render({ frame: 150, input: CHANGED_INPUT }),
      attribute: "data-kernel-boundary",
    }).length,
    0,
  );
  assert.equal(
    _tags({
      markup: _render({ frame: 150, input: CHANGED_INPUT }),
      attribute: "data-point-position",
    }).length,
    3,
  );
});

test("cones rise before addition and grid intensity grows through the combination beat", () => {
  const early = _tags({
      markup: _render({ frame: 13 }),
      attribute: "data-cone",
    })[0],
    raised = _tags({
      markup: _render({ frame: 55 }),
      attribute: "data-cone",
    })[0];
  assert.notEqual(early, raised);
  const values = _values({
    markup: _render({ frame: 80 }),
    attribute: "data-cell-intensity",
  }).map(Number);
  const hold = _values({
    markup: _render({ frame: 105 }),
    attribute: "data-cell-intensity",
  }).map(Number);
  assert.ok(
    values.some((value, index) => {
      return value > 0 && value < hold[index];
    }),
  );
  assert.ok(
    _render({ frame: 150 }).indexOf("data-cell-intensity") <
      _render({ frame: 150 }).indexOf("data-point-position"),
  );
});

test("kernel headings, fixed legend and zero-intensity qualifier have clear paint", () => {
  [13, 55, 80, 122, 150].forEach((frame) => {
    const paint = SvgPaintAssertions.getVisiblePaintEnvelopesFromMarkup(
      _render({ frame: frame, input: fixtures[2].input }),
    );
    SvgPaintAssertions.assertPaintClearance({
      texts: paint.filter(propEq("kind", "text")),
      rectangles: paint.filter((item) => {
        return item.kind === "rect" && item.opacity * item.fillOpacity > 0.9;
      }),
    });
  });
});

test("exact kernel-radius samples are zero and tiny unequal weights remain quantitatively visible in the field", () => {
  const input = inputSchema.parse({
    ...DEFAULT_INPUT,
    points: [
      { id: "a", x: 25, y: 25, weight: 1e-12 },
      { id: "b", x: 25, y: 25, weight: 2 },
    ],
    gridSize: 10,
    radii: { initial: 10, final: 20 },
    legendMaximum: 5,
  });
  assert.equal(
    Number(
      _values({
        markup: _render({ frame: 105, input: input }),
        attribute: "data-cell-intensity",
      })[23],
    ),
    0,
  );
  assert.equal(
    Number(
      _values({
        markup: _render({ frame: 105, input: input }),
        attribute: "data-cell-intensity",
      })[22],
    ),
    2.000000000001,
  );
  const pointTags = _tags({
    markup: _render({ frame: 150, input: input }),
    attribute: "data-point-position",
  });
  assert.equal(pointTags.length, 2);
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: pointTags[0], name: "cx" }),
    250,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: pointTags[0], name: "cy" }),
    270,
  );
});

test("combination adds separately timed point contributions instead of fading a preassembled final field", () => {
  const input = inputSchema.parse({
    ...DEFAULT_INPUT,
    points: [
      { id: "a", x: 25, y: 25, weight: 2 },
      { id: "b", x: 25, y: 25, weight: 0.5 },
    ],
    gridSize: 6,
    radii: { initial: 15, final: 30 },
  });
  const intermediate = Number(
    _values({
      markup: _render({ frame: 80, input: input }),
      attribute: "data-cell-intensity",
    })[7],
  );
  assert.ok(intermediate > 2 && intermediate < 2.5);
  assert.equal(
    Number(
      _values({
        markup: _render({ frame: 105, input: input }),
        attribute: "data-cell-intensity",
      })[7],
    ),
    2.5,
  );
});

test("the intensity legend grades the same quantity scale as the field", async () => {
  const { kernelDensitySpreadContract: correctionContract } =
    await import("../../KernelDensitySpread.contract");
  const { KernelDensitySpread: Component } =
    await import("../../KernelDensitySpread");
  Array.from([
    correctionContract.defaultInput,
    correctionContract.fixtures.find(propEq("id", "dense"))!.input,
  ]).forEach((source) => {
    const input = { ...source };
    const markup = renderToStaticMarkup(
      createElement(
        "svg",
        {},
        createElement(Component, {
          input,
          frame: 150,
          accent: "#9fefca",
          id: "correction",
        }),
      ),
    );
    _assertIntensityGradient(markup);
    const cells = [
      ...markup.matchAll(
        /data-cell-intensity="([^"]*)"[^>]*fill-opacity="([^"]*)"/g,
      ),
    ];
    cells.forEach(([, quantity, opacity]) => {
      return assert.equal(
        Number(opacity),
        Number(quantity) / input.legendMaximum,
      );
    });
  });
});
