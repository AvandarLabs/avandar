import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";
import { WideTableToObservations } from "./WideTableToObservations";
import {
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
} from "./WideTableToObservations.fixtures";
import { inputSchema, type Input } from "./WideTableToObservations.schema";
import type { PresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";

const render = ({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: Input }>): string =>
  renderToStaticMarkup(
    createElement(WideTableToObservations, {
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

test("measurement pairs retain provenance while missing omission conserves source cells", () => {
  const markup = render({ frame: 150 });
  assert.equal((markup.match(/data-observation=/g) ?? []).length, 4);
  assert.equal((markup.match(/data-missing="true"/g) ?? []).length, 1);
  const omitted = render({ frame: 150, input: fixtures[3].input });
  assert.equal((omitted.match(/data-observation=/g) ?? []).length, 3);
  assert.match(omitted, /data-omitted="1"/);
  const empty = render({ frame: 150, input: fixtures[1].input });
  assert.equal((empty.match(/data-observation=/g) ?? []).length, 0);
  assert.match(empty, /data-omitted="4"/);
  assert.match(empty, /4/);
});
test("measure strips carry subject copies from wide cells to long rows", () => {
  const start = _marker({
      markup: render({ frame: 51 }),
      key: "transfer-measurement",
      value: "0:0",
    }),
    middle = _marker({
      markup: render({ frame: 78 }),
      key: "transfer-measurement",
      value: "0:0",
    }),
    end = _marker({
      markup: render({ frame: 150 }),
      key: "transfer-measurement",
      value: "0:0",
    });
  assert.notEqual(
    SvgAttributes.getNumberFromMarkup({ attributes: start, name: "x" }),
    SvgAttributes.getNumberFromMarkup({ attributes: end, name: "x" }),
  );
  assert.notEqual(
    SvgAttributes.getNumberFromMarkup({ attributes: middle, name: "y" }),
    SvgAttributes.getNumberFromMarkup({ attributes: start, name: "y" }),
  );
  assert.notEqual(
    SvgAttributes.getNumberFromMarkup({ attributes: middle, name: "x" }),
    SvgAttributes.getNumberFromMarkup({ attributes: end, name: "x" }),
  );
});

import { registerStockLocalizationAssertions } from "../../../../tests/helpers/registerStockLocalizationAssertions";
import { registerStockTextLayoutAssertions } from "../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { wideTableToObservationsContract as contract } from "./WideTableToObservations.contract";

const EXCLUDED_TEXT_FIELDS: string[] = ["id", "measureId", "missingPolicy"];
const getVisibleTexts = ({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>): string[] => [
  input.copy.context,
  frame < 111 ? input.copy.source : input.copy.result,
  ...input.measures.flatMap((measure) =>
    input.subjects
      .filter(
        (subject) =>
          frame < 100 ||
          input.missingPolicy === "retain-missing-row" ||
          subject.values.find(({ measureId }) => measureId === measure.id)!
            .value !== null,
      )
      .flatMap((subject) => [subject.label, measure.label, measure.unit]),
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
    ["measures", 0, "label"],
    ["measures", 0, "unit"],
    ["measures", 1, "label"],
    ["measures", 1, "unit"],
    ["subjects", 0, "label"],
    ["subjects", 1, "label"],
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

test("all-null policies preserve all four source measurements with an explicit zero-row ledger", () => {
  const omitted = fixtures[1].input,
    retained = { ...omitted, missingPolicy: "retain-missing-row" as const };
  assert.equal(
    (render({ frame: 150, input: retained }).match(/data-observation=/g) ?? [])
      .length,
    4,
  );
  assert.match(render({ frame: 150, input: retained }), /data-omitted="0"/);
  assert.match(render({ frame: 150, input: omitted }), /data-omitted="4"/);
  assert.equal(
    (render({ frame: 150, input: omitted }).match(/data-observation=/g) ?? [])
      .length,
    0,
  );
});
test("reversed measurement arrays and duplicate subject labels retain zero, negative values and units", () => {
  const input = inputSchema.parse({
    ...fixtures[1].input,
    missingPolicy: "retain-missing-row",
    subjects: fixtures[1].input.subjects.map((subject) => ({
      ...subject,
      values: [
        { measureId: "b", value: -3.25 },
        { measureId: "", value: 0 },
      ],
    })),
  });
  const markup = render({ frame: 150, input: input });
  assert.equal((markup.match(/data-source-value="0"/g) ?? []).length, 2);
  assert.equal((markup.match(/data-source-value="-3.25"/g) ?? []).length, 2);
  assert.equal((markup.match(/data-subject-id=""/g) ?? []).length, 2);
  assert.match(markup, /aria-label="u"/);
  assert.match(markup, /aria-label="v"/);
});
test("measure strips occupy disjoint row envelopes before moving horizontally", () => {
  const markup = render({ frame: 110, input: fixtures[2].input });
  const strips = [
    ...markup.matchAll(/<rect[^>]*data-transfer-measurement=[^>]*>/g),
  ].map((match) => match[0]);
  assert.deepEqual(
    strips.map(
      (strip) => strip.match(/data-transfer-measurement="([^"]*)"/)![1],
    ),
    ["0:0", "1:0", "0:1", "1:1"],
  );
  const sorted = [...strips].sort(
    (a, b) =>
      SvgAttributes.getNumberFromMarkup({ attributes: a, name: "y" }) -
      SvgAttributes.getNumberFromMarkup({ attributes: b, name: "y" }),
  );
  sorted.slice(1).forEach((strip, index) =>
    assert.ok(
      SvgAttributes.getNumberFromMarkup({
        attributes: sorted[index],
        name: "y",
      }) +
        SvgAttributes.getNumberFromMarkup({
          attributes: sorted[index],
          name: "height",
        }) <=
        SvgAttributes.getNumberFromMarkup({ attributes: strip, name: "y" }),
    ),
  );
});

test("every rendered observation pair traces to exactly one authored source cell", () => {
  [
    DEFAULT_INPUT,
    fixtures[1].input,
    fixtures[2].input,
    fixtures[3].input,
  ].forEach((input) => {
    const markup = render({ frame: 150, input: input }),
      observations = [
        ...markup.matchAll(/<rect[^>]*data-observation=[^>]*>/g),
      ].map((match) => match[0]);
    const pairs = observations.map((tag) =>
      JSON.stringify([
        tag.match(/data-subject-id="([^"]*)"/)![1],
        tag.match(/data-measure-id="([^"]*)"/)![1],
      ]),
    );
    assert.equal(new Set(pairs).size, pairs.length);
    const expected = input.measures.flatMap((measure) =>
      input.subjects
        .filter(
          (subject) =>
            input.missingPolicy === "retain-missing-row" ||
            subject.values.find(({ measureId }) => measureId === measure.id)!
              .value !== null,
        )
        .map((subject) => JSON.stringify([subject.id, measure.id])),
    );
    assert.deepEqual(pairs, expected);
  });
});
test("source-guide hiding changes visible provenance keys without changing observations", () => {
  const visible = render({ frame: 150 }),
    hidden = render({
      frame: 150,
      input: { ...DEFAULT_INPUT, showSourceGuides: false },
    });
  assert.match(visible, /aria-label="1\/1"/);
  assert.doesNotMatch(hidden, /aria-label="1\/1"/);
  assert.equal(
    (visible.match(/data-observation=/g) ?? []).length,
    (hidden.match(/data-observation=/g) ?? []).length,
  );
});
