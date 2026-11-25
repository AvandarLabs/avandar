import { SpatialGridBinningTestState } from "./SpatialGridBinningTestState";

const {
  render: _render,
  getVisibleTexts: _getVisibleTexts,
  EXCLUSIONS,
} = SpatialGridBinningTestState;
import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { getSvgAttributeMatchesFromMarkup } from "../../../../../../tests/helpers/getSvgAttributeMatchesFromMarkup/getSvgAttributeMatchesFromMarkup";
import { registerStockDefaultTextAssertions } from "../../../../../../tests/helpers/registerStockDefaultTextAssertions";
import { registerStockPresetAssertions } from "../../../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { SvgPaintAssertions } from "../../../../../../tests/helpers/SvgPaintAssertions/SvgPaintAssertions";
import { spatialGridBinningContract as contract } from "../../SpatialGridBinning.contract";
import {
  DEFAULT_INPUT,
  fixtures,
  INVALID_INPUTS,
} from "../../SpatialGridBinning.fixtures";
import { inputSchema } from "../../SpatialGridBinning.schema";
import { assertChangedPointLabelsAndSourceLayers as _assertChangedPointLabelsAndSourceLayers } from "./assertChangedPointLabelsAndSourceLayers";
import { assertCountTokensTravelActualTag as _assertCountTokensTravelActualTag } from "./assertCountTokensTravelActualTag";
import { assertZeroCopyOwnsExplicitInput as _assertZeroCopyOwnsExplicitInput } from "./assertZeroCopyOwnsExplicitInput";

registerStockPresetAssertions({
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  contract,
  invalidInputs: INVALID_INPUTS,
  render: _render,
  excludedTextFields: EXCLUSIONS,
  getVisibleTexts: _getVisibleTexts,
});

registerStockDefaultTextAssertions({
  contract,
  expectedTextPaths: [
    ["labels", "unit"],
    ["labels", "zero"],
    ["labels", "total"],
    ["copy", "context"],
    ["copy", "before"],
    ["copy", "after"],
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

test("default grid displays exact 2,1,0,1 counts and four ledger tokens", () => {
  const markup = _render({ frame: 150 });
  assert.deepEqual(
    getSvgAttributeMatchesFromMarkup({
      markup: markup,
      attribute: "data-cell-count",
    }).values,
    ["2", "1", "0", "1"],
  );
  assert.equal(
    getSvgAttributeMatchesFromMarkup({
      markup: markup,
      attribute: "data-count-token",
    }).tags.length,
    4,
  );
  assert.match(markup, />2<\/tspan>/);
  assert.match(markup, />0<\/tspan>/);
});

test("internal and maximum boundaries assign every coincident identity exactly once for both grid sizes", () => {
  [2, 3].forEach((size) => {
    const points = [
      { id: "", x: 0, y: 0 },
      { id: "bound", x: 100 / size, y: 100 / size },
      { id: "max", x: 100, y: 100 },
      { id: "same", x: 100, y: 100 },
    ];
    const input = inputSchema.parse({
      ...DEFAULT_INPUT,
      points,
      grid: { rows: size, columns: size },
    });
    const markup = _render({ frame: 150, input: input });
    assert.equal(
      getSvgAttributeMatchesFromMarkup({
        markup: markup,
        attribute: "data-cell-count",
      })
        .values.map(Number)
        .reduce((sum, numCellPoints) => {
          return sum + numCellPoints;
        }, 0),
      points.length,
    );
    const tokens = getSvgAttributeMatchesFromMarkup({
      markup: markup,
      attribute: "data-count-token",
    }).tags;
    assert.equal(tokens.length, 4);
    assert.deepEqual(
      getSvgAttributeMatchesFromMarkup({
        markup: markup,
        attribute: "data-token-cell",
      }).values,
      ["0", String(size + 1), String(size * size - 1), String(size * size - 1)],
    );
  });
});

test("count tokens travel from actual fixed observations to distinct visible cell-ledger slots", () => {
  const input = fixtures[2].input;
  const setup = getSvgAttributeMatchesFromMarkup({
    markup: _render({ frame: 50, input: input }),
    attribute: "data-count-token",
  }).tags;
  const travel = getSvgAttributeMatchesFromMarkup({
    markup: _render({ frame: 80, input: input }),
    attribute: "data-count-token",
  }).tags;
  const hold = getSvgAttributeMatchesFromMarkup({
    markup: _render({ frame: 150, input: input }),
    attribute: "data-count-token",
  }).tags;
  assert.equal(hold.length, 12);
  assert.equal(
    new Set(
      hold.map((tag) => {
        return `${SvgAttributes.getNumberFromMarkup({ attributes: tag, name: "cx" })},${SvgAttributes.getNumberFromMarkup({ attributes: tag, name: "cy" })}`;
      }),
    ).size,
    12,
  );
  setup.forEach((tag, index) => {
    return _assertCountTokensTravelActualTag({
      tag,
      index,
      input,
      travel,
      hold,
    });
  });
  _assertChangedPointLabelsAndSourceLayers();
});

test("maximum and empty IDs preserve exact supplied content without invented minima", () => {
  const points = [
    { id: "", x: 0, y: 0 },
    { id: "界".repeat(12), x: 100, y: 100 },
  ];
  const input = inputSchema.parse({ ...DEFAULT_INPUT, points });
  assert.deepEqual(input.points, points);
  assert.doesNotThrow(() => {
    return _render({ frame: 150, input: input });
  });
  assert.equal(
    inputSchema.safeParse({
      ...input,
      points: [...points, { id: "", x: 0, y: 0 }],
    }).success,
    false,
  );
});

test("complete authored captions remain clear of other captions and opaque foreground rectangles", () => {
  fixtures.forEach(({ input }) => {
    [40, 72, 80, 106, 121, 139, 150].forEach((frame) => {
      const paint = SvgPaintAssertions.getVisiblePaintEnvelopesFromMarkup(
        _render({ frame: frame, input: input }),
      );
      SvgPaintAssertions.assertPaintClearance({
        texts: paint.filter((item) => {
          return item.kind === "text" && item.ariaLabel !== undefined;
        }),
        rectangles: paint.filter((item) => {
          return (
            item.kind === "rect" &&
            item.fill !== "none" &&
            item.opacity * item.fillOpacity > 0.9
          );
        }),
      });
    });
  });
});

test("zero copy owns an explicit zero sample even when every observed cell is nonzero", () => {
  const allNonzero = {
    ...DEFAULT_INPUT,
    points: [
      { id: "a", x: 0, y: 0 },
      { id: "b", x: 100, y: 0 },
      { id: "c", x: 0, y: 100 },
      { id: "d", x: 100, y: 100 },
    ],
  };
  [DEFAULT_INPUT, fixtures[2].input, allNonzero].forEach((input) => {
    return _assertZeroCopyOwnsExplicitInput(input);
  });
});
