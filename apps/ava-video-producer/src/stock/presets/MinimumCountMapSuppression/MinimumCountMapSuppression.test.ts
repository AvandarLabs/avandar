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
import { MinimumCountMapSuppression } from "./MinimumCountMapSuppression";
import { minimumCountMapSuppressionContract as contract } from "./MinimumCountMapSuppression.contract";
import {
  DEFAULT_INPUT,
  CHANGED_INPUT,
  fixtures,
  INVALID_INPUTS,
} from "./MinimumCountMapSuppression.fixtures";
import { inputSchema, type Input } from "./MinimumCountMapSuppression.schema";

function _render({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: Input }>): string {
  return renderToStaticMarkup(
    createElement(
      "svg",
      {},
      createElement(MinimumCountMapSuppression, {
        frame,
        accent: "#3caeff",
        id: "packet29",
        input,
      }),
    ),
  );
}

function _getVisibleTexts({ input }: Readonly<{ input: Input }>): string[] {
  return [
    ...Object.values(input.copy),
    ...Object.values(input.labels),
    ...input.cells.map(prop("label")),
  ];
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
    ["cells", 0, "label"],
    ["cells", 1, "label"],
    ["cells", 2, "label"],
    ["cells", 3, "label"],
    ["labels", "local"],
    ["labels", "public"],
    ["labels", "suppressed"],
    ["labels", "missing"],
    ["labels", "zero"],
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

test("public default cells distinguish suppression, released six, reported zero and missing without concealed values", () => {
  const markup = _render({ frame: 150 });
  assert.deepEqual(
    getSvgAttributeMatchesFromMarkup({
      markup: markup,
      attribute: "data-public-state",
    }).values,
    ["suppressed", "released", "zero", "missing"],
  );
  assert.deepEqual(
    getSvgAttributeMatchesFromMarkup({
      markup: markup,
      attribute: "data-released-count",
    }).values,
    ["6", "0"],
  );
  const publicMarkup = markup.slice(markup.indexOf('data-public-map="'));
  assert.doesNotMatch(publicMarkup, />2<|count="2"|total/i);
  assert.match(publicMarkup, /aria-label="Below release threshold"/);
  assert.match(publicMarkup, /aria-label="No data"/);
  assert.match(publicMarkup, /aria-label="Reported zero"/);
});
test("threshold equality releases while minimum-minus-one and all small positive counts remain undisclosed", () => {
  const input = fixtures[2].input;
  assert.deepEqual(
    getSvgAttributeMatchesFromMarkup({
      markup: _render({ frame: 150, input: input }),
      attribute: "data-public-state",
    }).values,
    ["missing", "zero", "suppressed", "released", "released", "released"],
  );
  assert.deepEqual(
    getSvgAttributeMatchesFromMarkup({
      markup: _render({ frame: 150, input: CHANGED_INPUT }),
      attribute: "data-public-state",
    }).values,
    ["suppressed", "suppressed", "zero", "missing"],
  );
  const allSuppressed = {
    ...DEFAULT_INPUT,
    cells: DEFAULT_INPUT.cells.map((cell, index) => ({
      ...cell,
      count: index + 1,
    })),
    minimum: 20,
  };
  const publicMarkup = _render({ frame: 150, input: allSuppressed }).split(
    'data-public-map="',
  )[1];
  assert.equal(
    getSvgAttributeMatchesFromMarkup({
      markup: publicMarkup,
      attribute: "data-released-count",
    }).tags.length,
    0,
  );
  assert.doesNotMatch(publicMarkup, />[1-4]<|count="[1-4]"/);
});
test("local toggle hides numeric sheet values and shutters precede safe count transfer", () => {
  assert.equal(
    getSvgAttributeMatchesFromMarkup({
      markup: _render({ frame: 40 }),
      attribute: "data-local-count",
    }).tags.length,
    3,
  );
  assert.equal(
    getSvgAttributeMatchesFromMarkup({
      markup: _render({ frame: 150, input: CHANGED_INPUT }),
      attribute: "data-local-count",
    }).tags.length,
    0,
  );
  const shutter = getSvgAttributeMatchesFromMarkup({
    markup: _render({ frame: 80 }),
    attribute: "data-threshold-shutter",
  }).tags[0];
  assert.ok(
    SvgAttributes.getNumberFromMarkup({ attributes: shutter, name: "height" }) >
      0,
  );
  assert.ok(
    SvgAttributes.getNumberFromMarkup({ attributes: shutter, name: "height" }) <
      36,
  );
  const travel = getSvgAttributeMatchesFromMarkup({
    markup: _render({ frame: 121 }),
    attribute: "data-released-count",
  }).tags[0];
  const hold = getSvgAttributeMatchesFromMarkup({
    markup: _render({ frame: 150 }),
    attribute: "data-released-count",
  }).tags[0];
  assert.ok(
    SvgAttributes.getNumberFromMarkup({ attributes: travel, name: "x" }) >
      SvgAttributes.getNumberFromMarkup({
        attributes: getSvgAttributeMatchesFromMarkup({
          markup: _render({ frame: 106 }),
          attribute: "data-released-count",
        }).tags[0],
        name: "x",
      }),
  );
  assert.ok(
    SvgAttributes.getNumberFromMarkup({ attributes: travel, name: "x" }) <
      SvgAttributes.getNumberFromMarkup({ attributes: hold, name: "x" }),
  );
  const markup = _render({ frame: 121 });
  assert.ok(
    markup.indexOf("data-public-tile") < markup.indexOf("data-released-count"),
  );
});
test("upper-only cell IDs permit one empty ID and preserve maximum IDs", () => {
  const input = inputSchema.parse({
    ...DEFAULT_INPUT,
    cells: DEFAULT_INPUT.cells.map((cell, index) => ({
      ...cell,
      id: index ? `${"界".repeat(11)}${index}` : "",
    })),
  });
  assert.doesNotThrow(() => _render({ frame: 150, input: input }));
  assert.equal(input.cells[0].id, "");
});
test("released count travel clears neighboring local counts and every complete cell caption", () => {
  const input = {
    ...fixtures[2].input,
    cells: fixtures[2].input.cells.map((cell, index) => ({
      ...cell,
      count: 80 + index,
    })),
  };
  Array.from({ length: 65 }, (_, index) => 106 + index / 2).forEach((frame) => {
    const markup = _render({ frame: frame, input: input });
    const copies = getSvgAttributeMatchesFromMarkup({
      markup: markup,
      attribute: "data-released-count",
    }).tags;
    copies.forEach((copy) => {
      const x = SvgAttributes.getNumberFromMarkup({
        attributes: copy,
        name: "x",
      });
      const y = SvgAttributes.getNumberFromMarkup({
        attributes: copy,
        name: "y",
      });
      const value = Number(copy.match(/data-released-count="([^"]+)"/)![1]);
      input.cells.forEach((cell, index) => {
        if (cell.count === value) {
          return;
        }
        const center = 125 + (index % 2) * 190;
        const baseline = 248 + Math.floor(index / 2) * 100;
        assert.ok(
          Math.abs(x - center) >= 50 || Math.abs(y - baseline) >= 22,
          `release crosses local count at ${frame}`,
        );
      });
    });
  });
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
test("fractional public count copies clear full dense cell-label paint", () => {
  const input = {
    ...fixtures[2].input,
    cells: fixtures[2].input.cells.map((cell, index) => ({
      ...cell,
      label: "界 界界界界界界界界界 界界界界",
      count: 80 + index,
    })),
  };
  Array.from({ length: 67 }, (_, index) => 106 + index / 2).forEach((frame) => {
    const paint = SvgPaintAssertions.getVisiblePaintEnvelopesFromMarkup(
      _render({ frame: frame, input: input }),
    );
    SvgPaintAssertions.assertPaintClearance({
      texts: paint.filter(
        (item) =>
          item.kind === "text" &&
          (item.ariaLabel !== undefined ||
            item.attributes["data-released-count"] !== undefined),
      ),
      rectangles: [],
    });
  });
});

test("local analytical counts stay readable beside closed public-release gates", async () => {
  const { minimumCountMapSuppressionContract: correctionContract } =
    await import("./MinimumCountMapSuppression.contract");
  const { MinimumCountMapSuppression: Component } =
    await import("./MinimumCountMapSuppression");
  Array.from([
    correctionContract.defaultInput,
    correctionContract.fixtures.find(propEq("id", "dense"))!.input,
  ]).forEach((source) => {
    const input = { ...source, showLocalCounts: true };
    const markup = renderToStaticMarkup(
      createElement(Component, {
        input,
        frame: 150,
        accent: "#9fefca",
        id: "correction",
      }),
    );

    const paint = SvgPaintAssertions.getVisiblePaintEnvelopesFromMarkup(markup);
    const localEnd = markup.indexOf("data-public-map=");
    const localPaint = SvgPaintAssertions.getVisiblePaintEnvelopesFromMarkup(
      `${markup.slice(0, localEnd).replace(/<g[^>]*$/, "")}</g>`,
    );
    const counts = localPaint.filter(
      (item) => item.kind === "text" && item.top >= 220 && item.top < 460,
    );
    assert.ok(counts.length > 0);
    SvgPaintAssertions.assertPaintClearance({
      texts: counts,
      rectangles: localPaint.filter(
        (item) =>
          item.kind === "rect" &&
          item.fill !== "none" &&
          item.opacity * item.fillOpacity === 1,
      ),
    });
    const publicMarkup = markup.slice(localEnd);
    input.cells
      .filter(
        (cell) =>
          cell.count !== null && cell.count > 0 && cell.count < input.minimum,
      )
      .forEach((cell) =>
        assert.ok(
          !publicMarkup.includes(`data-released-count="${cell.count}"`),
        ),
      );
  });
});
