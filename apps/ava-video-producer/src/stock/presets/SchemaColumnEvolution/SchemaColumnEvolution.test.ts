/**
 * Behavioral checks preserve authored identity, exact quantities and choices.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SchemaColumnEvolution } from "./SchemaColumnEvolution";
import {
  DEFAULT_INPUT,
  MINIMUM_INPUT,
  DENSE_INPUT,
  CHANGED_INPUT,
  fixtures,
  INVALID_INPUTS,
} from "./SchemaColumnEvolution.fixtures";
import { inputSchema, type Input } from "./SchemaColumnEvolution.schema";

function _render({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: typeof DEFAULT_INPUT }>): string {
  return renderToStaticMarkup(
    createElement(SchemaColumnEvolution, {
      frame,
      input,
      accent: "#9fefca",
      id: "test",
    }),
  );
}

test("historical values survive the added field and one later null remains visibly missing", () => {
  const before = _render({ frame: 11 });
  assert.equal((before.match(/data-earlier-record=/g) ?? []).length, 2);
  assert.doesNotMatch(before, /data-later-record=/);
  const after = _render({ frame: 150 });
  assert.equal((after.match(/data-earlier-record=/g) ?? []).length, 2);
  assert.equal((after.match(/data-later-record=/g) ?? []).length, 1);
  assert.equal((after.match(/data-missing-value=/g) ?? []).length, 2);
  ["North", "South", "East", "In person"].forEach((value) =>
    assert.ok(after.includes(`aria-label="${value}"`)),
  );
  const missing = _render({ frame: 150, input: CHANGED_INPUT });
  assert.equal((missing.match(/data-missing-value=/g) ?? []).length, 3);
  assert.doesNotMatch(missing, /In person/);
});

test("complete fixture set includes minimum, dense and changed inputs before behavior", () => {
  [DEFAULT_INPUT, MINIMUM_INPUT, DENSE_INPUT, CHANGED_INPUT].forEach((input) =>
    assert.deepEqual(inputSchema.parse(input), input),
  );
  assert.equal(fixtures.length, 4);
});
test("invalid structure and cross-field values are rejected", () => {
  INVALID_INPUTS.forEach((input) =>
    assert.equal(inputSchema.safeParse(input).success, false),
  );
});

import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";
import { schemaColumnEvolutionContract } from "./SchemaColumnEvolution.contract";

function _getVisibleTexts({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>): string[] {
  return [
    input.evidenceLabel,
    input.fields.existingLabel,
    ...input.earlierRecords.flatMap((row) => [
      row.label,
      row.recordedValue,
      row.id,
    ]),
    ...(frame >= 49 ? [input.fields.missingLabel] : []),
    ...(frame >= 12 ? [input.fields.addedLabel] : []),
    ...(input.showVersionLabels
      ? [
          input.phaseLabels.before,
          input.phaseLabels.expanded,
          ...(frame >= 132 ? [input.phaseLabels.later] : []),
        ]
      : []),
    ...(frame >= 93
      ? [
          input.laterRecord.id,
          input.laterRecord.label,
          input.laterRecord.recordedValue,
          input.laterRecord.addedValue ?? input.fields.missingLabel,
        ]
      : []),
  ];
}
const EXCLUDED_TEXT_FIELDS: string[] = ["id"];
registerStockPresetAssertions({
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  invalidInputs: INVALID_INPUTS,
  contract: schemaColumnEvolutionContract,
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

test("the original column slides left while the added header unfolds from its seam", () => {
  const originalBefore = _render({ frame: 11 }).match(
    /<rect data-original-header[^>]*>/,
  )![0];
  const originalAfter = _render({ frame: 48 }).match(
    /<rect data-original-header[^>]*>/,
  )![0];
  const added = _render({ frame: 48 }).match(
    /<rect data-added-header[^>]*>/,
  )![0];
  assert.ok(
    SvgAttributes.getNumberFromMarkup({
      attributes: originalBefore,
      name: "x",
    }) >
      SvgAttributes.getNumberFromMarkup({
        attributes: originalAfter,
        name: "x",
      }),
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: originalAfter,
      name: "x",
    }) +
      SvgAttributes.getNumberFromMarkup({
        attributes: originalAfter,
        name: "width",
      }),
    SvgAttributes.getNumberFromMarkup({ attributes: added, name: "x" }),
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: added, name: "width" }),
    260,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: _render({ frame: 11 }).match(
        /<rect data-added-header[^>]*>/,
      )![0],
      name: "width",
    }),
    0,
  );
});
test("all three old values stay exact and a hidden-version later null stays missing", () => {
  const input = {
    ...DENSE_INPUT,
    showVersionLabels: false,
    laterRecord: { ...DENSE_INPUT.laterRecord, addedValue: null },
  };
  [49, 72, 92, 108, 132, 150, 167].forEach((frame) => {
    const markup = _render({ frame: frame, input: input });
    input.earlierRecords.forEach((record) =>
      assert.ok(markup.includes(`data-earlier-record="${record.id}"`)),
    );
    assert.equal((markup.match(/data-earlier-record=/g) ?? []).length, 3);
    if (frame >= 93) {
      assert.equal((markup.match(/data-missing-value=/g) ?? []).length, 4);
    }
  });
});

import { getTextEnvelopesFromMarkup } from "./getTextEnvelopesFromMarkup";

test("wrapped old and added values stay inside each physical row", () => {
  const input = {
    ...DENSE_INPUT,
    earlierRecords: DENSE_INPUT.earlierRecords.map((row) => ({
      ...row,
      label: "界".repeat(22),
      recordedValue: "界".repeat(18),
    })),
    fields: { ...DENSE_INPUT.fields, missingLabel: "界".repeat(20) },
  };
  const markup = _render({ frame: 150, input: input });
  const texts = getTextEnvelopesFromMarkup(markup);
  const bodies = [...markup.matchAll(/<rect data-record-body[^>]*>/g)];
  const records = [...input.earlierRecords, input.laterRecord];
  assert.deepEqual(
    bodies.map(([body]) => body.match(/data-record-body="([^"]*)"/)![1]),
    records.map(prop("id")),
  );
  bodies.forEach((body, index) => {
    const y = SvgAttributes.getNumberFromMarkup({
      attributes: body[0],
      name: "y",
    });
    const right =
      SvgAttributes.getNumberFromMarkup({ attributes: body[0], name: "x" }) +
      SvgAttributes.getNumberFromMarkup({ attributes: body[0], name: "width" });
    const rowTexts = texts.filter((text) => text.y >= y && text.y < y + 60);
    const record = records[index];
    assert.deepEqual(
      rowTexts.map(prop("label")).sort(),
      [
        record.label,
        record.id,
        record.recordedValue,
        index < input.earlierRecords.length
          ? input.fields.missingLabel
          : (input.laterRecord.addedValue ?? input.fields.missingLabel),
      ].sort(),
    );
    rowTexts.forEach((text) => {
      assert.ok(text.bottom <= y + 60);
      assert.ok(text.right <= right);
    });
  });
});

test("the later-generation caption waits until the entering row has cleared its rail", () => {
  const input = {
    ...DENSE_INPUT,
    phaseLabels: { ...DENSE_INPUT.phaseLabels, later: `L${"W".repeat(29)}` },
  };
  [94, 100, 115, 131].forEach((frame) =>
    assert.ok(
      !_render({ frame: frame, input: input }).includes(
        `aria-label="${input.phaseLabels.later}"`,
      ),
    ),
  );
  assert.ok(
    _render({ frame: 145, input: input }).includes(
      `aria-label="${input.phaseLabels.later}"`,
    ),
  );
});
