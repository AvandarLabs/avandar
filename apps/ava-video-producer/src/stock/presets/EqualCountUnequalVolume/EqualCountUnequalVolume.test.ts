/**
 * Behavioral checks preserve authored identity, exact quantities and choices.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { propEq, prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { EqualCountUnequalVolume } from "./EqualCountUnequalVolume";
import {
  DEFAULT_INPUT,
  MINIMUM_INPUT,
  DENSE_INPUT,
  CHANGED_INPUT,
  fixtures,
} from "./EqualCountUnequalVolume.fixtures";
import { inputSchema, type Input } from "./EqualCountUnequalVolume.schema";
import { invalidInputs } from "./rejectedInputs/rejectedInputs.constants";

function _render({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: typeof DEFAULT_INPUT }>): string {
  return renderToStaticMarkup(
    createElement(EqualCountUnequalVolume, {
      frame,
      input,
      accent: "#9fefca",
      id: "test",
    }),
  );
}

test("equal counts keep zero-byte identities while exact byte lengths use a shared scale", () => {
  const after = _render({ frame: 150 });
  assert.equal((after.match(/data-item-id=/g) ?? []).length, 6);
  assert.equal((after.match(/data-item-count="3"/g) ?? []).length, 2);
  assert.match(after, /data-total-bytes="600"/);
  assert.match(after, /data-total-bytes="2200"/);
  const minimum = _render({ frame: 150, input: MINIMUM_INPUT });
  assert.equal((minimum.match(/data-item-id=/g) ?? []).length, 2);
  assert.match(minimum, /data-total-bytes="0"/);
  assert.match(minimum, /data-total-bytes="1"/);
  assert.equal((minimum.match(/data-scale-bytes="1"/g) ?? []).length, 2);
});

test("complete fixture set includes minimum, dense and changed inputs before behavior", () => {
  [DEFAULT_INPUT, MINIMUM_INPUT, DENSE_INPUT, CHANGED_INPUT].forEach((input) =>
    assert.deepEqual(inputSchema.parse(input), input),
  );
  assert.equal(fixtures.length, 4);
});
test("invalid structure and cross-field values are rejected", () => {
  invalidInputs.forEach((input) =>
    assert.equal(inputSchema.safeParse(input).success, false),
  );
});

import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";
import { equalCountUnequalVolumeContract } from "./EqualCountUnequalVolume.contract";

function _getVisibleTexts({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>): string[] {
  return [
    input.copy.count,
    input.copy.size,
    input.measure.basisLabel,
    input.copy.proxyNote,
    input.copy.example,
    ...input.groups.flatMap((group) => [
      group.label,
      ...group.items.map(prop("label")),
    ]),
    ...(frame >= 111 ? [input.copy.total] : []),
  ];
}
const EXCLUDED_TEXT_FIELDS: string[] = ["id", "itemKind", "displayUnit"];
registerStockPresetAssertions({
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  invalidInputs,
  contract: equalCountUnequalVolumeContract,
  render: _render,
  excludedTextFields: EXCLUDED_TEXT_FIELDS,
  getVisibleTexts: _getVisibleTexts,
});
registerStockTextLayoutAssertions({
  inputSchema,
  fixtures,
  render: _render,
  excludedTextFields: EXCLUDED_TEXT_FIELDS,
  getVisibleTexts: _getVisibleTexts,
});

test("byte strips unfold from the same physical zero with exact input-weighted widths", () => {
  const before = [
    ..._render({ frame: 48 }).matchAll(/<rect data-byte-strip[^>]*>/g),
  ].map((match) =>
    SvgAttributes.getNumberFromMarkup({ attributes: match[0], name: "width" }),
  );
  assert.deepEqual(before, [0, 0, 0, 0, 0, 0]);
  const after = [
    ..._render({ frame: 110 }).matchAll(/<rect data-byte-strip[^>]*>/g),
  ];
  after.forEach((match, index) => {
    assert.equal(
      SvgAttributes.getNumberFromMarkup({ attributes: match[0], name: "x" }),
      440,
    );
    assert.ok(
      Math.abs(
        SvgAttributes.getNumberFromMarkup({
          attributes: match[0],
          name: "width",
        }) -
          ([100, 200, 300, 500, 800, 900][index] / 2400) * 460,
      ) < 1e-10,
    );
  });
  ["B", "KiB", "MiB"].forEach((displayUnit) => {
    const input = {
      ...MINIMUM_INPUT,
      measure: {
        ...MINIMUM_INPUT.measure,
        displayUnit: displayUnit as Input["measure"]["displayUnit"],
      },
    };
    const strips = [
      ..._render({ frame: 150, input: input }).matchAll(
        /<rect data-byte-strip[^>]*>/g,
      ),
    ].map((match) =>
      SvgAttributes.getNumberFromMarkup({
        attributes: match[0],
        name: "width",
      }),
    );
    assert.deepEqual(strips, [0, 460]);
    assert.equal(
      (
        _render({ frame: 150, input: input }).match(/data-item-count="1"/g) ??
        []
      ).length,
      2,
    );
  });
});
test("count-guide and item-size toggles do not alter byte geometry or totals", () => {
  const visible = _render({ frame: 150, input: DEFAULT_INPUT });
  const hidden = _render({
    frame: 150,
    input: {
      ...DEFAULT_INPUT,
      showCountGuides: false,
      showItemSizes: false,
    },
  });
  assert.deepEqual(
    [...visible.matchAll(/<rect data-byte-strip[^>]*>/g)].map(
      (match) => match[0],
    ),
    [...hidden.matchAll(/<rect data-byte-strip[^>]*>/g)].map(
      (match) => match[0],
    ),
  );
  assert.doesNotMatch(hidden, /data-count-guide=/);
  assert.match(hidden, /data-total-bytes="2200"/);
  assert.ok(
    _render({ frame: 150, input: CHANGED_INPUT }).includes('aria-label="rows"'),
  );
});

import { getTextEnvelopesFromMarkup } from "../SchemaColumnEvolution/getTextEnvelopesFromMarkup";

test("first collection total clears the second shelf label and strips clear item copy", () => {
  const input = {
    ...DENSE_INPUT,
    groups: DENSE_INPUT.groups.map((group, index) => ({
      ...group,
      label: `${index}${"W".repeat(23)}`,
    })),
    copy: { ...DENSE_INPUT.copy, total: `T${"W".repeat(23)}` },
  };
  const markup = _render({ frame: 150, input: input });
  const texts = getTextEnvelopesFromMarkup(markup);
  const firstTotal = texts.find(propEq("label", input.copy.total))!;
  const secondTitle = texts.find(
    (text) => text.label === input.groups[1].label,
  )!;
  assert.ok(firstTotal.bottom + 4 <= secondTitle.top);
  const itemTexts = texts.filter((text) =>
    DENSE_INPUT.groups.some((group) =>
      group.items.some(
        propEq<{ label: unknown }, "label", unknown>("label", text.label),
      ),
    ),
  );
  itemTexts.forEach((text) => assert.ok(text.right + 4 <= 440));
});
