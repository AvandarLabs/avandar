import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { getSvgAttributeMatchesFromMarkup } from "../../../../tests/helpers/getSvgAttributeMatchesFromMarkup/getSvgAttributeMatchesFromMarkup";
import { registerStockLocalizationAssertions } from "../../../../tests/helpers/registerStockLocalizationAssertions";
import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";
import { SvgPaintAssertions } from "../../../../tests/helpers/SvgPaintAssertions/SvgPaintAssertions";
import { SpatialGridBinning } from "./SpatialGridBinning";
import { spatialGridBinningContract as contract } from "./SpatialGridBinning.contract";
import {
  DEFAULT_INPUT,
  CHANGED_INPUT,
  fixtures,
  INVALID_INPUTS,
} from "./SpatialGridBinning.fixtures";
import { inputSchema, type Input } from "./SpatialGridBinning.schema";

function _render({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: Input }>): string {
  return renderToStaticMarkup(
    createElement(
      "svg",
      {},
      createElement(SpatialGridBinning, {
        frame,
        accent: "#3caeff",
        id: "packet29",
        input,
      }),
    ),
  );
}

function _getVisibleTexts({ input }: Readonly<{ input: Input }>): string[] {
  return [...Object.values(input.copy), ...Object.values(input.labels)];
}
const EXCLUSIONS: string[] = ["id"];
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
registerStockLocalizationAssertions({
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
        .reduce((sum, numCellPoints) => sum + numCellPoints, 0),
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
      hold.map(
        (tag) =>
          `${SvgAttributes.getNumberFromMarkup({ attributes: tag, name: "cx" })},${SvgAttributes.getNumberFromMarkup({ attributes: tag, name: "cy" })}`,
      ),
    ).size,
    12,
  );
  setup.forEach((tag, index) => {
    assert.equal(
      SvgAttributes.getNumberFromMarkup({ attributes: tag, name: "cx" }),
      48 + input.points[index].x * 3.3,
    );
    assert.notEqual(
      SvgAttributes.getNumberFromMarkup({
        attributes: travel[index],
        name: "cx",
      }),
      SvgAttributes.getNumberFromMarkup({ attributes: tag, name: "cx" }),
    );
    assert.notEqual(
      SvgAttributes.getNumberFromMarkup({
        attributes: travel[index],
        name: "cx",
      }),
      SvgAttributes.getNumberFromMarkup({
        attributes: hold[index],
        name: "cx",
      }),
    );
  });
  const markup = _render({ frame: 150, input: CHANGED_INPUT });
  assert.equal(
    getSvgAttributeMatchesFromMarkup({
      markup: markup,
      attribute: "data-source-ghost",
    }).tags.length,
    0,
  );
  CHANGED_INPUT.points.forEach((point) =>
    assert.ok(markup.includes(`aria-label="${point.id}"`)),
  );
  assert.ok(
    markup.indexOf("data-cell-shade") < markup.indexOf("data-count-token"),
  );
});
test("maximum and empty IDs preserve exact supplied content without invented minima", () => {
  const points = [
    { id: "", x: 0, y: 0 },
    { id: "界".repeat(12), x: 100, y: 100 },
  ];
  const input = inputSchema.parse({ ...DEFAULT_INPUT, points });
  assert.deepEqual(input.points, points);
  assert.doesNotThrow(() => _render({ frame: 150, input: input }));
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
        texts: paint.filter(
          (item) => item.kind === "text" && item.ariaLabel !== undefined,
        ),
        rectangles: paint.filter(
          (item) =>
            item.kind === "rect" &&
            item.fill !== "none" &&
            item.opacity * item.fillOpacity > 0.9,
        ),
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
    [36, 80, 150].forEach((frame) => {
      const markup = _render({ frame: frame, input: input });
      const sample = getSvgAttributeMatchesFromMarkup({
        markup: markup,
        attribute: "data-zero-sample",
      }).tags[0];
      assert.ok(sample);
      const paint =
        SvgPaintAssertions.getVisiblePaintEnvelopesFromMarkup(markup);
      const caption = paint.find(
        (item) =>
          item.kind === "text" &&
          item.ariaLabel === input.labels.zero &&
          item.left >= 450 &&
          item.top < 150,
      )!;
      assert.ok(
        caption.left >
          SvgAttributes.getNumberFromMarkup({ attributes: sample, name: "x" }) +
            SvgAttributes.getNumberFromMarkup({
              attributes: sample,
              name: "width",
            }),
      );
      assert.ok(
        caption.left -
          SvgAttributes.getNumberFromMarkup({ attributes: sample, name: "x" }) -
          SvgAttributes.getNumberFromMarkup({
            attributes: sample,
            name: "width",
          }) <=
          20,
      );
      assert.ok(
        getSvgAttributeMatchesFromMarkup({
          markup: markup,
          attribute: "data-zero-value",
        }).tags[0].includes('data-zero-value="0"'),
      );
    });
  });
});
