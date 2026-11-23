import { PluginCapabilityInstallTestState } from "./PluginCapabilityInstallTestState";

const {
  render: _render,
  getVisibleTexts: _getVisibleTexts,
  EXCLUDED_TEXT_FIELDS,
} = PluginCapabilityInstallTestState;
import assert from "node:assert/strict";
import test from "node:test";
import { propEq } from "@avandar/utils";
import { registerStockPresetAssertions } from "../../../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { getTextEnvelopesFromMarkup } from "../../../SchemaColumnEvolution/getTextEnvelopesFromMarkup";
import { pluginCapabilityInstallContract } from "../../PluginCapabilityInstall.contract";
import {
  DEFAULT_INPUT,
  MINIMUM_INPUT,
  DENSE_INPUT,
  CHANGED_INPUT,
  fixtures,
} from "../../PluginCapabilityInstall.fixtures";
import { inputSchema } from "../../PluginCapabilityInstall.schema";
import { INVALID_INPUTS } from "../../rejectedInputs.constants";
import { assertOneUtilityMovesAboveBefore as _assertOneUtilityMovesAboveBefore } from "./assertOneUtilityMovesAboveBefore";

test("install seats one utility and derives one tally per retained record while defer leaves an empty socket", () => {
  const before = _render({ frame: 11 });
  assert.equal((before.match(/data-source-record=/g) ?? []).length, 4);
  assert.doesNotMatch(before, /data-installed-utility=/);
  const after = _render({ frame: 150 });
  assert.equal((after.match(/data-installed-utility=/g) ?? []).length, 1);
  assert.equal((after.match(/data-tally-record=/g) ?? []).length, 4);
  assert.match(after, /data-category-count="3"/);
  assert.match(after, /data-category-count="1"/);
  assert.equal(
    (
      _render({ frame: 150, input: MINIMUM_INPUT }).match(
        /data-tally-record=/g,
      ) ?? []
    ).length,
    0,
  );
  assert.doesNotMatch(
    _render({ frame: 150, input: MINIMUM_INPUT }),
    /data-installed-utility=/,
  );
  assert.equal(
    (
      _render({ frame: 150, input: CHANGED_INPUT }).match(
        /data-category-count="2"/g,
      ) ?? []
    ).length,
    2,
  );
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
  contract: pluginCapabilityInstallContract,
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

test("one utility moves from above the empty socket into its exact opening", () => {
  const before = _render({ frame: 55 }).match(
    /<rect data-utility-body[^>]*>/,
  )![0];
  const after = _render({ frame: 90 }).match(
    /<rect data-utility-body[^>]*>/,
  )![0];
  const socket = _render({ frame: 90 }).match(
    /<rect data-tool-socket[^>]*>/,
  )![0];
  _assertOneUtilityMovesAboveBefore({ before, socket, after });
  const deferred = _render({
    frame: 150,
    input: {
      ...DEFAULT_INPUT,
      installation: { choice: "defer", decisionLabel: "Deferred" },
    },
  });
  assert.equal(deferred.match(/<rect data-utility-body[^>]*>/)![0], before);
  assert.doesNotMatch(
    deferred,
    /data-category-bar=|data-category-count=|data-tally-record=/,
  );
});

test("concentrated membership keeps empty category labels and one tally per source ID", () => {
  const markup = _render({ frame: 150, input: DENSE_INPUT });
  assert.equal((markup.match(/data-category-count="0"/g) ?? []).length, 2);
  assert.equal((markup.match(/data-tally-record=/g) ?? []).length, 8);
  const bars = [...markup.matchAll(/<rect data-category-bar[^>]*>/g)].map(
    (match) => {
      return SvgAttributes.getNumberFromMarkup({
        attributes: match[0],
        name: "width",
      });
    },
  );
  assert.deepEqual(bars, [135, 0, 0]);
  assert.deepEqual(
    [
      ..._render({
        frame: 150,
        input: { ...DENSE_INPUT, showRecordIds: false },
      }).matchAll(/<rect data-category-bar[^>]*>/g),
    ].map((match) => {
      return SvgAttributes.getNumberFromMarkup({
        attributes: match[0],
        name: "width",
      });
    }),
    bars,
  );
  [11, 55, 90, 132, 150].forEach((frame) => {
    return assert.deepEqual(
      [
        ..._render({ frame: frame, input: DENSE_INPUT }).matchAll(
          /<g data-source-record="([^"]*)" data-source-category="([^"]*)"/g,
        ),
      ].map((match) => {
        return [match[1], match[2]];
      }),
      DENSE_INPUT.records.map((row) => {
        return [row.id, row.categoryId];
      }),
    );
  });
});

test("wrapped source headings clear each other and the first source record", () => {
  const input = {
    ...DENSE_INPUT,
    copy: {
      ...DENSE_INPUT.copy,
      records: `界 ${"界".repeat(25)} ${"界".repeat(7)}`,
    },
    utility: { ...DENSE_INPUT.utility, fieldLabel: "界".repeat(26) },
  };
  const texts = getTextEnvelopesFromMarkup(
    _render({ frame: 150, input: input }),
  );
  const heading = texts.find(propEq("label", input.copy.records))!;
  const field = texts.find(propEq("label", input.utility.fieldLabel))!;
  assert.ok(heading.bottom + 2 <= field.top);
  assert.ok(field.bottom + 2 <= 153);
});
