/** Behavioral geometry, exact input contracts and deterministic frame seeks. */
import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";
import { WorkDecomposition } from "./WorkDecomposition";
import { workDecompositionContract as contract } from "./WorkDecomposition.contract";
import {
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
} from "./WorkDecomposition.fixtures";
import { inputSchema, type Input } from "./WorkDecomposition.schema";

const render = ({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: Input }>): string =>
  renderToStaticMarkup(
    createElement(
      "svg",
      {},
      createElement(WorkDecomposition, {
        frame,
        input,
        accent: "#72d5bd",
        id: "work-test",
      }),
    ),
  );
function _pieces({ frame, input }: { frame: number; input: Input }) {
  return [
    ...render({ frame: frame, input: input }).matchAll(
      /<rect[^>]*data-piece-id="[^"]*"[^>]*>/g,
    ),
  ].map((match) => match[0]);
}
test("piece geometry conserves the original slab area and supplied effort in both partition layouts", () => {
  fixtures.forEach(({ input }) =>
    ["strips", "alternating-cuts"].forEach((layout) => {
      const document = {
        ...input,
        partitionLayout: layout as Input["partitionLayout"],
      };
      const slab = render({ frame: 24, input: document }).match(
        /<rect[^>]*data-original-slab="true"[^>]*>/,
      )?.[0];
      assert.ok(slab, "The original continuous slab must be visible");
      const area =
        SvgAttributes.getNumberFromMarkup({ attributes: slab, name: "width" }) *
        SvgAttributes.getNumberFromMarkup({ attributes: slab, name: "height" });
      const pieces = _pieces({ frame: 150, input: document });
      assert.equal(pieces.length, input.workItems.length);
      const total = input.workItems.reduce((sum, item) => sum + item.effort, 0);
      let summedArea = 0;
      pieces.forEach((piece, index) => {
        const pieceArea =
          SvgAttributes.getNumberFromMarkup({
            attributes: piece,
            name: "width",
          }) *
          SvgAttributes.getNumberFromMarkup({
            attributes: piece,
            name: "height",
          });
        summedArea += pieceArea;
        assert.ok(
          Math.abs(pieceArea / area - input.workItems[index].effort / total) <
            1e-10,
        );
        assert.ok(piece.includes(`data-parent="${input.parentLabel}"`));
      });
      assert.ok(Math.abs(summedArea - area) < 1e-7);
    }),
  );
});
test("partition orientation changes cuts while equal-gap separation leaves nonoverlapping pieces", () => {
  assert.notDeepEqual(
    _pieces({
      frame: 150,
      input: { ...DEFAULT_INPUT, partitionLayout: "strips" },
    }),
    _pieces({
      frame: 150,
      input: { ...DEFAULT_INPUT, partitionLayout: "alternating-cuts" },
    }),
  );
  ["strips", "alternating-cuts"].forEach((layout) => {
    const pieces = _pieces({
      frame: 150,
      input: {
        ...fixtures[2].input,
        partitionLayout: layout as Input["partitionLayout"],
      },
    });
    assert.equal(pieces.length, 6);
    pieces.forEach((piece, index) =>
      pieces.slice(index + 1).forEach((other) =>
        assert.ok(
          SvgAttributes.getNumberFromMarkup({
            attributes: piece,
            name: "x",
          }) +
            SvgAttributes.getNumberFromMarkup({
              attributes: piece,
              name: "width",
            }) <=
            SvgAttributes.getNumberFromMarkup({
              attributes: other,
              name: "x",
            }) ||
            SvgAttributes.getNumberFromMarkup({
              attributes: other,
              name: "x",
            }) +
              SvgAttributes.getNumberFromMarkup({
                attributes: other,
                name: "width",
              }) <=
              SvgAttributes.getNumberFromMarkup({
                attributes: piece,
                name: "x",
              }) ||
            SvgAttributes.getNumberFromMarkup({
              attributes: piece,
              name: "y",
            }) +
              SvgAttributes.getNumberFromMarkup({
                attributes: piece,
                name: "height",
              }) <=
              SvgAttributes.getNumberFromMarkup({
                attributes: other,
                name: "y",
              }) ||
            SvgAttributes.getNumberFromMarkup({
              attributes: other,
              name: "y",
            }) +
              SvgAttributes.getNumberFromMarkup({
                attributes: other,
                name: "height",
              }) <=
              SvgAttributes.getNumberFromMarkup({
                attributes: piece,
                name: "y",
              }),
        ),
      ),
    );
  });
});
test("invalid duplicate identities and impossible effort weights are rejected", () =>
  invalidInputs.forEach((input) =>
    assert.equal(inputSchema.safeParse(input).success, false),
  ));

registerStockPresetAssertions({
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  invalidInputs,
  contract,
  render,
  excludedTextFields: ["id", "insertBeforeId", "kind", "partitionLayout"],
  getVisibleTexts: ({ input }) => [
    input.parentLabel,
    input.unitLabel,
    input.groupingLabel,
    ...input.workItems.map(prop("label")),
  ],
  textFrames: [150],
});
test("ruled cut lines travel across the continuous slab before pieces separate", () => {
  const cuts = (frame: number) =>
    [
      ...render({ frame: frame }).matchAll(
        /<line[^>]*data-cut-index="[^"]*"[^>]*>/g,
      ),
    ].map((match) => match[0]);
  const before = cuts(38),
    after = cuts(86);
  assert.equal(before.length, DEFAULT_INPUT.workItems.length - 1);
  before.forEach((line, index) => {
    assert.equal(
      SvgAttributes.getNumberFromMarkup({ attributes: line, name: "x1" }),
      SvgAttributes.getNumberFromMarkup({ attributes: line, name: "x2" }),
    );
    assert.equal(
      SvgAttributes.getNumberFromMarkup({ attributes: line, name: "y1" }),
      SvgAttributes.getNumberFromMarkup({ attributes: line, name: "y2" }),
    );
    assert.ok(
      SvgAttributes.getNumberFromMarkup({
        attributes: after[index],
        name: "x1",
      }) !==
        SvgAttributes.getNumberFromMarkup({
          attributes: after[index],
          name: "x2",
        }) ||
        SvgAttributes.getNumberFromMarkup({
          attributes: after[index],
          name: "y1",
        }) !==
          SvgAttributes.getNumberFromMarkup({
            attributes: after[index],
            name: "y2",
          }),
    );
  });
});
test("maximum-density pieces remain inside the reserved bracket throughout separation", () => {
  ["strips", "alternating-cuts"].forEach((layout) => {
    const input = {
      ...fixtures[2].input,
      partitionLayout: layout as Input["partitionLayout"],
    };
    Array.from({ length: 87 }, (_, index) => 38 + index).forEach((frame) =>
      _pieces({ frame, input }).forEach((piece) => {
        const x = SvgAttributes.getNumberFromMarkup({
            attributes: piece,
            name: "x",
          }),
          y = SvgAttributes.getNumberFromMarkup({
            attributes: piece,
            name: "y",
          });
        assert.ok(
          x >= 66 &&
            x +
              SvgAttributes.getNumberFromMarkup({
                attributes: piece,
                name: "width",
              }) <=
              614,
        );
        assert.ok(
          y >= 206 &&
            y +
              SvgAttributes.getNumberFromMarkup({
                attributes: piece,
                name: "height",
              }) <=
              524,
        );
      }),
    );
  });
});
