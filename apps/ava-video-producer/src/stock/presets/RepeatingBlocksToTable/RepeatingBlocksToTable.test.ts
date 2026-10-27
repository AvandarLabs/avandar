import assert from "node:assert/strict";
import test from "node:test";
import { prop, propEq } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";
import { SvgPaintAssertions } from "../../../../tests/helpers/SvgPaintAssertions/SvgPaintAssertions";
import { RepeatingBlocksToTable } from "./RepeatingBlocksToTable";
import {
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
} from "./RepeatingBlocksToTable.fixtures";
import { inputSchema, type Input } from "./RepeatingBlocksToTable.schema";
import type { PresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
const render = ({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: Input }>): string =>
  renderToStaticMarkup(
    createElement(RepeatingBlocksToTable, {
      frame,
      input,
      accent: "#72d5bd",
      id: "packet27",
    }),
  );
function _marker({
  markup,
  key,
  value,
}: {
  markup: string;
  key: string;
  value: string;
}): string {
  const tags = [...markup.matchAll(/<[^>]+>/g)].map((match) => match[0]);
  const tag = tags.find((candidateTag) =>
    candidateTag.includes(`data-${key}="${value}"`),
  );
  assert.ok(tag, `${key} ${value}`);
  return tag;
}

test("reordered fields retain identity-aligned values and explicit missing cells", () => {
  const markup = render({ frame: 150 });
  assert.equal((markup.match(/data-output-block=/g) ?? []).length, 2);
  assert.match(markup, /data-field="need" data-cell-value="Not stated"/);
  const changed = render({ frame: 150, input: fixtures[3].input });
  const need = _marker({ markup: changed, key: "output-field", value: "need" }),
    action = _marker({ markup: changed, key: "output-field", value: "action" });
  assert.ok(
    SvgAttributes.getNumberFromMarkup({ attributes: need, name: "x" }) <
      SvgAttributes.getNumberFromMarkup({ attributes: action, name: "x" }),
  );
  assert.match(changed, /data-field="action" data-cell-value="Repair tap"/);
  assert.doesNotMatch(changed, /data-block-number=/);
});
test("field-value strips physically rotate their block organization into table rows", () => {
  const start = _marker({
      markup: render({ frame: 56 }),
      key: "transfer-cell",
      value: "0:0",
    }),
    middle = _marker({
      markup: render({ frame: 80 }),
      key: "transfer-cell",
      value: "0:0",
    }),
    end = _marker({
      markup: render({ frame: 150 }),
      key: "transfer-cell",
      value: "0:0",
    });
  assert.notEqual(
    SvgAttributes.getNumberFromMarkup({ attributes: start, name: "x" }),
    SvgAttributes.getNumberFromMarkup({ attributes: end, name: "x" }),
  );
  assert.notEqual(
    SvgAttributes.getNumberFromMarkup({ attributes: middle, name: "x" }),
    SvgAttributes.getNumberFromMarkup({ attributes: end, name: "x" }),
  );
  assert.notEqual(
    SvgAttributes.getNumberFromMarkup({ attributes: start, name: "y" }),
    SvgAttributes.getNumberFromMarkup({ attributes: end, name: "y" }),
  );
});

import { registerStockLocalizationAssertions } from "../../../../tests/helpers/registerStockLocalizationAssertions";
import { registerStockTextLayoutAssertions } from "../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { repeatingBlocksToTableContract as contract } from "./RepeatingBlocksToTable.contract";
const EXCLUDED_TEXT_FIELDS: string[] = ["id", "fieldId"];
const getVisibleTexts = ({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>): string[] => [
  ...Object.values(input.copy),
  ...input.fields.map(prop("label")),
  ...input.blocks.map(prop("heading")),
  ...input.blocks.flatMap(({ cells }) =>
    cells.map(({ text }) => text ?? input.missingLabel),
  ),
];
const options = {
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  invalidInputs,
  contract,
  render,
  excludedTextFields: EXCLUDED_TEXT_FIELDS,
  getVisibleTexts,
} satisfies PresetAssertions<Input>;
registerStockPresetAssertions(options);
registerStockTextLayoutAssertions(options);
registerStockLocalizationAssertions({
  contract,
  expectedTextPaths: [
    ["fields", 0, "label"],
    ["fields", 1, "label"],
    ["blocks", 0, "heading"],
    ["blocks", 1, "heading"],
    ["blocks", 0, "cells", 0, "text"],
    ["blocks", 0, "cells", 1, "text"],
    ["blocks", 1, "cells", 0, "text"],
    ["missingLabel"],
    ["copy", "context"],
    ["copy", "source"],
    ["copy", "result"],
  ],
  suppliedInputs: fixtures.map(prop("input")),
});
test("every required top-level field rejects omission", () => {
  Object.keys(DEFAULT_INPUT).forEach((key) => {
    const incomplete = { ...DEFAULT_INPUT };
    Reflect.deleteProperty(incomplete, key);
    assert.equal(inputSchema.safeParse(incomplete).success, false, key);
  });
});

test("empty IDs, duplicate headings and a wholly missing block retain separate semantic cells", () => {
  const input = fixtures[1].input;
  assert.deepEqual(inputSchema.parse(input), input);
  const markup = render({ frame: 150, input: input });
  assert.equal((markup.match(/data-output-block=/g) ?? []).length, 2);
  assert.equal((markup.match(/data-cell-value="Not stated"/g) ?? []).length, 2);
  assert.match(markup, /data-field="" data-cell-value="x"/);
  assert.doesNotMatch(markup, /data-block-number=/);
});
test("maximum source and final strip rectangles stay inside the canvas", () => {
  [13, 55, 56, 63.5, 75, 90, 105, 150].forEach((frame) => {
    const markup = render({ frame: frame, input: fixtures[2].input });
    const cells = [
      ...markup.matchAll(/<rect[^>]*data-transfer-cell=[^>]*>/g),
    ].map((match) => match[0]);
    cells.forEach((cell) => {
      const x = SvgAttributes.getNumberFromMarkup({
          attributes: cell,
          name: "x",
        }),
        y = SvgAttributes.getNumberFromMarkup({ attributes: cell, name: "y" });
      assert.ok(
        x >= 0 &&
          x +
            SvgAttributes.getNumberFromMarkup({
              attributes: cell,
              name: "width",
            }) <=
            960,
      );
      assert.ok(
        y >= 0 &&
          y +
            SvgAttributes.getNumberFromMarkup({
              attributes: cell,
              name: "height",
            }) <=
            600,
      );
    });
  });
});

function _assertReadablePaint(markup: string): void {
  const paint = SvgPaintAssertions.getVisiblePaintEnvelopesFromMarkup(markup);
  SvgPaintAssertions.assertPaintClearance({
    texts: paint.filter(propEq("kind", "text")),
    rectangles: paint.filter(
      (item) =>
        item.kind === "rect" && item.fill !== "none" && item.fillOpacity > 0,
    ),
  });
}

test("dense RepeatingBlocksToTable transfer preserves visible text and foreground clearance at frame 90", () => {
  _assertReadablePaint(render({ frame: 90, input: fixtures[2].input }));
});

test("RepeatingBlocksToTable transfer sampling preserves visible text and foreground clearance", () => {
  [
    DEFAULT_INPUT,
    fixtures[1].input,
    ...[2, 3].flatMap((numBlocks) =>
      [2, 3].map((numFields) => {
        const dense = fixtures[2].input,
          fields = dense.fields.slice(0, numFields);
        return inputSchema.parse({
          ...dense,
          fields,
          blocks: dense.blocks.slice(0, numBlocks).map((block) => ({
            ...block,
            cells: block.cells.filter((cell) =>
              fields.some(propEq("id", cell.fieldId)),
            ),
          })),
        });
      }),
    ),
  ].forEach((input) => {
    Array.from({ length: 111 }, (_, index) => 56 + index / 2).forEach(
      (frame) => {
        SvgPaintAssertions.assertTextCanvasBounds({
          markup: render({ frame: frame, input: input }),
        });
        _assertReadablePaint(render({ frame: frame, input: input }));
      },
    );
  });
});
