/** Behavioral geometry, exact input contracts and deterministic frame seeks. */
import assert from "node:assert/strict";
import test from "node:test";
import { propEq, prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";
import { PriorityInsertion } from "./PriorityInsertion";
import { priorityInsertionContract as contract } from "./PriorityInsertion.contract";
import {
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
} from "./PriorityInsertion.fixtures";
import { inputSchema, type Input } from "./PriorityInsertion.schema";
const render = ({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: Input }>): string =>
  renderToStaticMarkup(
    createElement(
      "svg",
      {},
      createElement(PriorityInsertion, {
        frame,
        input,
        accent: "#72d5bd",
        id: "priority-test",
      }),
    ),
  );
function _items({ frame, input }: { frame: number; input: Input }) {
  return [
    ...render({ frame: frame, input: input }).matchAll(
      /<rect[^>]*data-queue-id="[^"]*"[^>]*>/g,
    ),
  ].map((match) => match[0]);
}
test("incoming work occupies its insertion slot without changing existing relative order", () => {
  fixtures.forEach(({ input }) =>
    input.queue.forEach((target) => {
      const document = { ...input, insertBeforeId: target.id };
      const insertion = input.queue.findIndex(propEq("id", target.id));
      const pieces = _items({ frame: 150, input: document }).sort(
        (a, b) =>
          SvgAttributes.getNumberFromMarkup({ attributes: a, name: "y" }) -
          SvgAttributes.getNumberFromMarkup({ attributes: b, name: "y" }),
      );
      assert.equal(pieces.length, input.queue.length + 1);
      const expected = [
        ...input.queue.slice(0, insertion),
        input.incomingItem,
        ...input.queue.slice(insertion),
      ];
      pieces.forEach((piece, index) =>
        assert.ok(piece.includes(`data-queue-id="${expected[index].id}"`)),
      );
    }),
  );
});
test("only the chosen suffix shifts one slot before the incoming item leaves its side spur", () => {
  const start = _items({ frame: 38, input: DEFAULT_INPUT }),
    opened = _items({ frame: 108, input: DEFAULT_INPUT });
  assert.equal(start.length, 5);
  DEFAULT_INPUT.queue.forEach((item, index) => {
    const target = DEFAULT_INPUT.queue.findIndex(
      propEq("id", DEFAULT_INPUT.insertBeforeId),
    );
    assert.equal(
      SvgAttributes.getNumberFromMarkup({
        attributes: opened[index],
        name: "y",
      }) -
        SvgAttributes.getNumberFromMarkup({
          attributes: start[index],
          name: "y",
        }),
      index >= target ? 58 : 0,
    );
  });
  assert.ok(
    SvgAttributes.getNumberFromMarkup({
      attributes: opened.at(-1)!,
      name: "x",
    }) >
      SvgAttributes.getNumberFromMarkup({ attributes: opened[0], name: "x" }),
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: _items({ frame: 132, input: DEFAULT_INPUT }).at(-1)!,
      name: "x",
    }),
    SvgAttributes.getNumberFromMarkup({ attributes: opened[0], name: "x" }),
  );
});
test("unknown insertion references and duplicate incoming identities are rejected", () =>
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
    input.priorityLabel,
    input.serviceLabel,
    input.incomingItem.label,
    ...input.queue.map(prop("label")),
  ],
  textFrames: [150],
});
test("the incoming item follows the side spur before crossing into the opened slot", () => {
  const initial = _items({ frame: 108, input: DEFAULT_INPUT }).at(-1)!,
    turn = _items({ frame: 120, input: DEFAULT_INPUT }).at(-1)!,
    final = _items({ frame: 132, input: DEFAULT_INPUT }).at(-1)!;
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: turn, name: "x" }),
    SvgAttributes.getNumberFromMarkup({ attributes: initial, name: "x" }),
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: turn, name: "y" }),
    SvgAttributes.getNumberFromMarkup({ attributes: final, name: "y" }),
  );
  assert.ok(
    SvgAttributes.getNumberFromMarkup({ attributes: final, name: "x" }) <
      SvgAttributes.getNumberFromMarkup({ attributes: turn, name: "x" }),
  );
});
test("dense queue items stay inside the canvas throughout every insertion position", () => {
  const input = fixtures[2].input;
  input.queue.forEach((target) =>
    Array.from({ length: 133 }, (_, frame) => frame).forEach((frame) =>
      _items({ frame, input: { ...input, insertBeforeId: target.id } }).forEach(
        (item) => {
          const x = SvgAttributes.getNumberFromMarkup({
              attributes: item,
              name: "x",
            }),
            y = SvgAttributes.getNumberFromMarkup({
              attributes: item,
              name: "y",
            });
          assert.ok(
            x >= 0 &&
              x +
                SvgAttributes.getNumberFromMarkup({
                  attributes: item,
                  name: "width",
                }) <=
                960,
          );
          assert.ok(
            y >= 0 &&
              y +
                SvgAttributes.getNumberFromMarkup({
                  attributes: item,
                  name: "height",
                }) <=
                600,
          );
        },
      ),
    ),
  );
});
