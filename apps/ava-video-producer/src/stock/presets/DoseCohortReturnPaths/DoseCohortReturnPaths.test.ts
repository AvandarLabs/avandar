/** Semantic rendering tests for dose-cohort-return-paths. */
import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DoseCohortReturnPaths } from "./DoseCohortReturnPaths";
import {
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
} from "./DoseCohortReturnPaths.fixtures";
import type { PresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
function _render({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: Input }>) {
  return renderToStaticMarkup(
    createElement(DoseCohortReturnPaths, {
      frame,
      input,
      accent: "#65d6ad",
      id: "semantic",
    }),
  );
}
test("Every visit uses the same cohort denominator; recorded, missed, not-yet-due and unknown states remain distinct and changing one visit never creates a new person.", () => {
  const markup = _render({ frame: 150 });
  assert.equal(
    (markup.match(/data-participant=/g) ?? []).length,
    DEFAULT_INPUT.participants.length,
  );
  assert.equal(
    (markup.match(/data-denominator="6"/g) ?? []).length,
    DEFAULT_INPUT.visits.length,
  );
});

import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { doseCohortReturnPathsContract } from "./DoseCohortReturnPaths.contract";
import { inputSchema, type Input } from "./DoseCohortReturnPaths.schema";
const textLayoutOptions = {
  inputSchema,
  fixtures,
  render: _render,
  excludedTextFields: ["id", "visitId", "state", "emphasis"],
  getVisibleTexts: ({ input }: Readonly<{ input: Input }>) => [
    input.sceneLabel,
    input.copy.baseline,
    ...input.visits.map(prop("label")),
    ...input.participants.map(prop("label")),
    input.copy.recorded,
    input.copy.missed,
    input.copy.notDue,
    input.copy.unknown,
    ...(input.showFractions ? [input.copy.retained] : []),
  ],
} satisfies Pick<
  PresetAssertions<Input>,
  | "inputSchema"
  | "fixtures"
  | "render"
  | "excludedTextFields"
  | "getVisibleTexts"
>;
registerStockPresetAssertions({
  ...textLayoutOptions,
  defaultInput: DEFAULT_INPUT,
  invalidInputs,
  contract: doseCohortReturnPathsContract,
});
registerStockTextLayoutAssertions(textLayoutOptions);

test("nonrecorded first visits retain the entire denominator and emphasis never changes identities", () => {
  const input = fixtures[3].input;
  const markup = _render({ frame: 150, input: input });
  assert.equal(
    (markup.match(/data-participant=/g) ?? []).length,
    input.participants.length,
  );
  input.visits.forEach((visit) => {
    const numerator = input.participants.filter((person) =>
      person.records.some(
        (record) => record.visitId === visit.id && record.state === "recorded",
      ),
    ).length;
    assert.ok(
      markup.includes(`>${numerator}/${input.participants.length}</text>`),
    );
  });
  assert.match(markup, />3\/6<\/text>/);
  const translations = (value: string) =>
    Array.from(
      value.matchAll(
        /data-cohort-person="([^"]*)" transform="translate\(([^ ]+) ([^)]+)\)"/g,
      ),
    ).map((match) => match.slice(1));
  const expected = translations(markup);
  ["all-records", "missed-and-returned", "unknown-records"].forEach(
    (emphasis) =>
      assert.deepEqual(
        translations(
          _render({
            frame: 150,
            input: { ...input, emphasis: emphasis as Input["emphasis"] },
          }),
        ),
        expected,
      ),
  );
  [24, 36, 54, 72, 94, 116, 150].forEach((frame) =>
    translations(_render({ frame: frame, input: fixtures[2].input })).forEach(
      ([, x, y]) => {
        assert.ok(Number(x) - 8 >= 270 && Number(x) + 8 < 920);
        assert.ok(Number(y) - 11 >= 160 && Number(y) + 14 < 480);
      },
    ),
  );
  assert.notDeepEqual(
    translations(_render({ frame: 24, input: input })),
    expected,
  );
  input.participants.forEach((person) => {
    const recorded = input.visits
      .map((visit, index) =>
        person.records.some(
          (record) =>
            record.visitId === visit.id && record.state === "recorded",
        )
          ? index
          : -1,
      )
      .filter((index) => index >= 0);
    assert.equal(
      Number(expected.find(([id]) => id === person.id)?.[1]),
      recorded.length ? 380 + Math.max(...recorded) * 155 : 285,
    );
  });
});

test("missed-and-returned accents only chronologically later records regardless of record array order", () => {
  const states: Array<
    Array<Input["participants"][number]["records"][number]["state"]>
  > = [
    ["recorded", "recorded", "missed"],
    ["recorded", "missed", "recorded"],
  ];
  states.forEach((sequence) => {
    const input = inputSchema.parse({
      ...DEFAULT_INPUT,
      emphasis: "missed-and-returned",
      participants: DEFAULT_INPUT.participants.map((person) => ({
        ...person,
        records: sequence.map((state, index) => ({
          visitId: DEFAULT_INPUT.visits[index].id,
          state,
        })),
      })),
    });
    const expectedColors =
      sequence[1] === "missed"
        ? ["#728794", "#65d6ad", "#65d6ad"]
        : ["#728794", "#728794", "#65d6ad"];
    const markup = _render({ frame: 150, input: input });
    const marks = Array.from(
      markup.matchAll(
        /data-record-person="[^"]*" data-record-visit="([^"]*)"[\s\S]*?<path transform="[^"]*"[^>]*stroke="([^"]*)"/g,
      ),
    );
    assert.deepEqual(
      marks.slice(0, 3).map((match) => match[1]),
      input.visits.map(prop("id")),
    );
    assert.deepEqual(
      marks.slice(0, 3).map((match) => match[2]),
      expectedColors,
    );
    const reordered = {
      ...input,
      participants: input.participants.map((person) => ({
        ...person,
        records: [...person.records].reverse(),
      })),
    };
    assert.equal(_render({ frame: 150, input: reordered }), markup);
    const allRecords = _render({
      frame: 150,
      input: { ...input, emphasis: "all-records" },
    });
    const people = (svg: string) =>
      Array.from(
        svg.matchAll(/data-cohort-person="[^"]*" transform="[^"]*"/g),
        (match) => match[0],
      );
    assert.deepEqual(people(markup), people(allRecords));
    assert.equal((markup.match(/data-denominator="6"/g) ?? []).length, 3);
  });
});
