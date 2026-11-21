import { SchemaColumnEvolutionTestState } from "./SchemaColumnEvolutionTestState";

const {
  render: _render,
  getVisibleTexts: _getVisibleTexts,
  EXCLUDED_TEXT_FIELDS,
} = SchemaColumnEvolutionTestState;
import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { registerStockPresetAssertions } from "../../../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { getTextEnvelopesFromMarkup } from "../../getTextEnvelopesFromMarkup";
import { schemaColumnEvolutionContract } from "../../SchemaColumnEvolution.contract";
import {
  DEFAULT_INPUT,
  MINIMUM_INPUT,
  DENSE_INPUT,
  CHANGED_INPUT,
  fixtures,
  INVALID_INPUTS,
} from "../../SchemaColumnEvolution.fixtures";
import { inputSchema } from "../../SchemaColumnEvolution.schema";
import { assertWrappedOldAddedValuesBody as _assertWrappedOldAddedValuesBody } from "./assertWrappedOldAddedValuesBody";

test("historical values survive the added field and one later null remains visibly missing", () => {
  const before = _render({ frame: 11 });
  assert.equal((before.match(/data-earlier-record=/g) ?? []).length, 2);
  assert.doesNotMatch(before, /data-later-record=/);
  const after = _render({ frame: 150 });
  assert.equal((after.match(/data-earlier-record=/g) ?? []).length, 2);
  assert.equal((after.match(/data-later-record=/g) ?? []).length, 1);
  assert.equal((after.match(/data-missing-value=/g) ?? []).length, 2);
  ["North", "South", "East", "In person"].forEach((value) => {
    return assert.ok(after.includes(`aria-label="${value}"`));
  });
  const missing = _render({ frame: 150, input: CHANGED_INPUT });
  assert.equal((missing.match(/data-missing-value=/g) ?? []).length, 3);
  assert.doesNotMatch(missing, /In person/);
});

test("complete fixture set includes minimum, dense and changed inputs before behavior", () => {
  [DEFAULT_INPUT, MINIMUM_INPUT, DENSE_INPUT, CHANGED_INPUT].forEach(
    (input) => {
      return assert.deepEqual(inputSchema.parse(input), input);
    },
  );
  assert.equal(fixtures.length, 4);
});

test("invalid structure and cross-field values are rejected", () => {
  INVALID_INPUTS.forEach((input) => {
    return assert.equal(inputSchema.safeParse(input).success, false);
  });
});

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
    input.earlierRecords.forEach((record) => {
      return assert.ok(markup.includes(`data-earlier-record="${record.id}"`));
    });
    assert.equal((markup.match(/data-earlier-record=/g) ?? []).length, 3);
    if (frame >= 93) {
      assert.equal((markup.match(/data-missing-value=/g) ?? []).length, 4);
    }
  });
});

test("wrapped old and added values stay inside each physical row", () => {
  const input = {
    ...DENSE_INPUT,
    earlierRecords: DENSE_INPUT.earlierRecords.map((row) => {
      return { ...row, label: "界".repeat(22), recordedValue: "界".repeat(18) };
    }),
    fields: { ...DENSE_INPUT.fields, missingLabel: "界".repeat(20) },
  };
  const markup = _render({ frame: 150, input: input });
  const texts = getTextEnvelopesFromMarkup(markup);
  const bodies = [...markup.matchAll(/<rect data-record-body[^>]*>/g)];
  const records = [...input.earlierRecords, input.laterRecord];
  assert.deepEqual(
    bodies.map(([body]) => {
      return body.match(/data-record-body="([^"]*)"/)![1];
    }),
    records.map(prop("id")),
  );
  bodies.forEach((body, index) => {
    return _assertWrappedOldAddedValuesBody({
      body,
      index,
      texts,
      records,
      input,
    });
  });
});

test("the later-generation caption waits until the entering row has cleared its rail", () => {
  const input = {
    ...DENSE_INPUT,
    phaseLabels: { ...DENSE_INPUT.phaseLabels, later: `L${"W".repeat(29)}` },
  };
  [94, 100, 115, 131].forEach((frame) => {
    return assert.ok(
      !_render({ frame: frame, input: input }).includes(
        `aria-label="${input.phaseLabels.later}"`,
      ),
    );
  });
  assert.ok(
    _render({ frame: 145, input: input }).includes(
      `aria-label="${input.phaseLabels.later}"`,
    ),
  );
});
