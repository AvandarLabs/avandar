/** Behavioral conservation and physical choreography assertions. */
import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SchoolCostSatchel } from "./SchoolCostSatchel";
import {
  equalTupleInput,
  changedInput,
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
  denseInput,
  minimumInput,
} from "./SchoolCostSatchel.fixtures";
import type { PresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
function _render({
  frame,
  input,
}: Readonly<{ frame: number; input: Input }>): string {
  return renderToStaticMarkup(
    createElement(SchoolCostSatchel, {
      frame,
      input,
      accent: "#81d7bd",
      id: "packet15",
    }),
  );
}
test("cost total and share widths use each supplied expense exactly once", () => {
  const markup = _render({ frame: 150, input: changedInput });
  assert.match(markup, /data-total="8"/);
  assert.match(markup, /data-expense-id="zero"/);
  const widths = [
    ...markup.matchAll(
      /<rect[^>]*data-share-id="([^"]+)"[^>]*width="([^"]+)"/g,
    ),
  ];
  assert.equal(widths.length, 3);
  widths.forEach((match) =>
    assert.equal(Number(match[2]), match[1] === "zero" ? 0 : 44),
  );
  assert.ok(
    markup.indexOf('data-expense-id="meal"') <
      markup.indexOf('data-expense-id="fare"'),
  );
  assert.ok(
    markup.indexOf('data-expense-id="fare"') <
      markup.indexOf('data-expense-id="zero"'),
  );
});

import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { getConservativeWidthFromText } from "../../text/getConservativeWidthFromText";
import { schoolCostSatchelContract as contract } from "./SchoolCostSatchel.contract";
import { inputSchema, type Input } from "./SchoolCostSatchel.schema";
function _getVisibleTexts({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>): string[] {
  const ordered =
    input.unpackOrder === "largest-first"
      ? [...input.expenses].sort((left, right) => right.amount - left.amount)
      : input.expenses;
  return [
    input.periodLabel,
    input.unitLabel,
    input.sceneLabels.school,
    input.sceneLabels.learner,
    input.caption,
    ...(frame >= 108 ? [input.sceneLabels.total] : []),
    ...ordered.filter((_, index) => frame >= 62 + index * 9).map(prop("label")),
  ];
}
const options = {
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  invalidInputs,
  contract,
  render: _render,
  excludedTextFields: ["id", "object", "unpackOrder"],
  getVisibleTexts: _getVisibleTexts,
  textFrames: [24, 72, 150],
} satisfies PresetAssertions<Input>;
registerStockPresetAssertions(options);
registerStockTextLayoutAssertions(options);
test("zero costs, equal tuples and both orders retain exact totals without multiplication", () => {
  [changedInput, equalTupleInput, denseInput, minimumInput].forEach((input) => {
    (["input-order", "largest-first"] as const).forEach((unpackOrder) => {
      const authored = { ...input, unpackOrder };
      assert.deepEqual(inputSchema.parse(authored), authored);
      const markup = _render({ frame: 150, input: authored });
      const total = input.expenses.reduce(
        (sum, expense) => sum + expense.amount,
        0,
      );
      assert.match(markup, new RegExp(`data-total="${total}"`));
      const ids = [...markup.matchAll(/data-expense-id="([^"]+)"/g)].map(
        (match) => match[1],
      );
      const expected =
        unpackOrder === "input-order"
          ? input.expenses
          : [...input.expenses].sort(
              (left, right) => right.amount - left.amount,
            );
      assert.deepEqual(ids, expected.map(prop("id")));
      input.expenses.forEach((expense) =>
        assert.equal(
          markup.split(`data-expense-id="${expense.id}"`).length - 1,
          1,
        ),
      );
    });
  });
  assert.doesNotMatch(
    _render({ frame: 150, input: { ...denseInput, showExpenseShares: false } }),
    /data-share-id=/,
  );
});
test("every object silhouette clears canvas, neighboring final objects and caption rails", () => {
  (["input-order", "largest-first"] as const).forEach((unpackOrder) => {
    const input = { ...denseInput, unpackOrder };
    [
      0, 37.999, 38, 38.001, 46.999, 47, 47.001, 74, 97.999, 98, 98.001, 150,
    ].forEach((frame) => {
      const markup = _render({ frame: frame, input: input });
      const positions = [
        ...markup.matchAll(
          /data-expense-object="[^"]+" transform="translate\(([-.\d]+) ([-.\d]+)\)" opacity="([^"]+)"/g,
        ),
      ];
      positions
        .filter((position) => Number(position[3]) > 0)
        .forEach((position) => {
          const x = Number(position[1]);
          const y = Number(position[2]);
          assert.ok(
            x - 32 >= 0 && x + 32 <= 960 && y - 33 >= 0 && y + 33 < 316,
          );
        });
      if (frame === 150) {
        positions
          .slice(1)
          .forEach((position, index) =>
            assert.ok(Number(position[1]) - Number(positions[index][1]) > 64),
          );
      }
    });
  });
  const markup = _render({ frame: 150, input: denseInput });
  [...markup.matchAll(/<text[^>]*y="330"[^>]*>(.*?)<\/text>/g)].forEach(
    (label) => {
      const numLines = [...label[1].matchAll(/<tspan/g)].length;
      assert.ok(330 + (numLines - 1) * 18.2 + 3 < 435 - 20);
    },
  );
});
test("schema and serialized semantic rules preserve the exact authoring contract", () => {
  [
    undefined,
    {},
    { ...DEFAULT_INPUT, periodLabel: "" },
    { ...DEFAULT_INPUT, unitLabel: "x".repeat(19) },
    {
      ...DEFAULT_INPUT,
      sceneLabels: { ...DEFAULT_INPUT.sceneLabels, extra: "x" },
    },
  ].forEach((value) =>
    assert.equal(inputSchema.safeParse(value).success, false),
  );
  const rules = JSON.parse(
    JSON.stringify(contract.semanticRules),
  ) as typeof contract.semanticRules;
  assert.ok(
    rules.some(
      (rule) =>
        rule.paths.includes("expenses.*.amount") &&
        rule.description.includes("positive"),
    ),
  );
  assert.ok(
    rules.some((rule) =>
      rule.description.includes("Equal label/object/amount tuples"),
    ),
  );
});
test("the complete total label clears the amount-gathering bracket", () => {
  const markup = _render({
    frame: 150,
    input: {
      ...denseInput,
      sceneLabels: { ...denseInput.sceneLabels, total: "W".repeat(24) },
    },
  });
  const label = markup.match(/<text[^>]*x="95"[^>]*y="505"[^>]*>(.*?)<\/text>/);
  assert.ok(label);
  const firstLine = label[1].match(/<tspan[^>]*>(.*?)<\/tspan>/);
  assert.ok(firstLine);
  const width = getConservativeWidthFromText({
    text: firstLine[1],
    fontSize: 16,
  });
  assert.ok(95 + width <= 333 - 6);
});
test("every accepted expense collection size drives its actual unfolded objects", () => {
  [2, 3, 4, 5].forEach((numExpenses) => {
    const input = {
      ...denseInput,
      expenses: denseInput.expenses.slice(0, numExpenses),
    };
    const markup = _render({ frame: 150, input: inputSchema.parse(input) });
    assert.equal(
      [...markup.matchAll(/data-expense-shape=/g)].length,
      numExpenses,
    );
    assert.match(markup, new RegExp(`data-total="${numExpenses * 20}"`));
  });
});
