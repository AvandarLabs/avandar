import assert from "node:assert/strict";
import test from "node:test";
import { prop, propEq } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { getSvgAttributeMatchesFromMarkup } from "../../../../tests/helpers/getSvgAttributeMatchesFromMarkup/getSvgAttributeMatchesFromMarkup";
import { registerStockLocalizationAssertions } from "../../../../tests/helpers/registerStockLocalizationAssertions";
import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";
import { SvgPaintAssertions } from "../../../../tests/helpers/SvgPaintAssertions/SvgPaintAssertions";
import { KernelDensitySpread } from "./KernelDensitySpread";
import { kernelDensitySpreadContract as contract } from "./KernelDensitySpread.contract";
import {
  DEFAULT_INPUT,
  CHANGED_INPUT,
  fixtures,
  invalidInputs,
} from "./KernelDensitySpread.fixtures";
import { inputSchema, type Input } from "./KernelDensitySpread.schema";
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
registerStockLocalizationAssertions({
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
  assert.equal(
    Number(
      _values({
        markup: _render({ frame: 150, input: input }),
        attribute: "data-cell-intensity",
      })[35],
    ),
    0,
  );
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
  assert.match(_render({ frame: 150, input: input }), /Zero modeled intensity/);
});
test("radii physically widen or narrow cones while retaining fixed points and legend", () => {
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
  });
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
  assert.ok(values.some((value, index) => value > 0 && value < hold[index]));
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
      rectangles: paint.filter(
        (item) => item.kind === "rect" && item.opacity * item.fillOpacity > 0.9,
      ),
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
    await import("./KernelDensitySpread.contract");
  const { KernelDensitySpread: Component } =
    await import("./KernelDensitySpread");
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
    const gradient = markup.match(
      /<linearGradient[^>]*>([\s\S]*?)<\/linearGradient>/,
    );
    assert.ok(gradient, "Intensity legend contains a graded scale");
    const stops = [...gradient[1].matchAll(/stop-opacity="([^"]*)"/g)].map(
      (match) => Number(match[1]),
    );
    assert.equal(stops[0], 0);
    assert.equal(stops.at(-1), 1);
    assert.match(markup, /fill="url\(#/);
    const cells = [
      ...markup.matchAll(
        /data-cell-intensity="([^"]*)"[^>]*fill-opacity="([^"]*)"/g,
      ),
    ];
    cells.forEach(([, quantity, opacity]) =>
      assert.equal(Number(opacity), Number(quantity) / input.legendMaximum),
    );
  });
});
