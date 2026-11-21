/** Semantic rendering tests for dose-cohort-return-paths. */
import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { DoseCohortReturnPaths } from "./DoseCohortReturnPaths";
import { doseCohortReturnPathsContract } from "./DoseCohortReturnPaths.contract";
import {
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
} from "./DoseCohortReturnPaths.fixtures";
import { inputSchema, type Input } from "./DoseCohortReturnPaths.schema";
import type { PresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";

function _makeRecordColorSampleFromSequence(
  sequence: Array<
    Array<Input["participants"][number]["records"][number]["state"]>
  >[number],
): {
  input: Input;
  expectedColors: string[];
  markup: ReturnType<typeof _render>;
  marks: RegExpMatchArray[];
} {
  const input = inputSchema.parse({
    ...DEFAULT_INPUT,
    emphasis: "missed-and-returned",
    participants: DEFAULT_INPUT.participants.map((person) => {
      return {
        ...person,
        records: sequence.map((state, index) => {
          return { visitId: DEFAULT_INPUT.visits[index].id, state };
        }),
      };
    }),
  });
  const expectedColors =
    sequence[1] === "missed"
      ? ["#728794", "#65d6ad", "#65d6ad"]
      : ["#728794", "#728794", "#65d6ad"];
  const markup = _render({ frame: 150, input });
  const marks = Array.from(
    markup.matchAll(
      /data-record-person="[^"]*" data-record-visit="([^"]*)"[\s\S]*?<g transform="[^"]*"><path\b[^>]*\bstroke="([^"]*)"/g,
    ),
  );
  return { input, expectedColors, markup, marks };
}

function _assertEmphasisPreservesTranslations({
  translations,
  input,
  expected,
}: Readonly<{
  translations: (value: string) => string[][];
  input: (typeof fixtures)[number]["input"];
  expected: string[][];
}>): void {
  ["all-records", "missed-and-returned", "unknown-records"].forEach(
    (emphasis) => {
      return assert.deepEqual(
        translations(
          _render({
            frame: 150,
            input: { ...input, emphasis: emphasis as Input["emphasis"] },
          }),
        ),
        expected,
      );
    },
  );
}

function _assertRecordedVisitEndpoints({
  input,
  expected,
}: Readonly<{
  input: (typeof fixtures)[number]["input"];
  expected: string[][];
}>): void {
  input.participants.forEach((person) => {
    const recorded = input.visits
      .map((visit, index) => {
        return person.records.some((record) => {
          return record.visitId === visit.id && record.state === "recorded";
        })
          ? index
          : -1;
      })
      .filter((index) => {
        return index >= 0;
      });
    assert.equal(
      Number(
        expected.find(([id]) => {
          return id === person.id;
        })?.[1],
      ),
      recorded.length ? 380 + Math.max(...recorded) * 155 : 285,
    );
  });
}

function _assertAuthoredVisitMarkOrder({
  marks,
  input,
}: Readonly<{ marks: RegExpMatchArray[]; input: Input }>): void {
  assert.deepEqual(
    marks.slice(0, 3).map((match) => {
      return match[1];
    }),
    input.visits.map(prop("id")),
  );
}

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
test("default dose hold frame retains participant count and reports denominator six for each visit", () => {
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
const textLayoutOptions = {
  inputSchema,
  fixtures,
  render: _render,
  excludedTextFields: ["id", "visitId", "state", "emphasis"],
  getVisibleTexts: ({ input }: Readonly<{ input: Input }>) => {
    return [
      input.sceneLabel,
      input.copy.baseline,
      ...input.visits.map(prop("label")),
      ...input.participants.map(prop("label")),
      input.copy.recorded,
      input.copy.missed,
      input.copy.notDue,
      input.copy.unknown,
      ...(input.showFractions ? [input.copy.retained] : []),
    ];
  },
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
  const markup = _render({ frame: 150, input });
  assert.equal(
    (markup.match(/data-participant=/g) ?? []).length,
    input.participants.length,
  );
  input.visits.forEach((visit) => {
    const numerator = input.participants.filter((person) => {
      return person.records.some((record) => {
        return record.visitId === visit.id && record.state === "recorded";
      });
    }).length;
    assert.ok(
      markup.includes(`>${numerator}/${input.participants.length}</text>`),
    );
  });
  assert.match(markup, />3\/6<\/text>/);
  const translations = (value: string) => {
    return Array.from(
      value.matchAll(
        /data-cohort-person="([^"]*)" transform="translate\(([^ ]+) ([^)]+)\)"/g,
      ),
    ).map((match) => {
      return match.slice(1);
    });
  };
  const expected = translations(markup);
  _assertEmphasisPreservesTranslations({
    translations,
    input,
    expected,
  });
  [24, 36, 54, 72, 94, 116, 150].forEach((frame) => {
    return translations(_render({ frame, input: fixtures[2].input })).forEach(
      ([, x, y]) => {
        assert.ok(Number(x) - 8 >= 270 && Number(x) + 8 < 920);
        assert.ok(Number(y) - 11 >= 160 && Number(y) + 14 < 480);
      },
    );
  });
  assert.notDeepEqual(translations(_render({ frame: 24, input })), expected);
  _assertRecordedVisitEndpoints({ input, expected });
});
test("missed-and-returned accents only chronologically later records regardless of record array order", () => {
  const states: Array<
    Array<Input["participants"][number]["records"][number]["state"]>
  > = [
    ["recorded", "recorded", "missed"],
    ["recorded", "missed", "recorded"],
  ];
  states.forEach((sequence) => {
    const { input, expectedColors, markup, marks } =
      _makeRecordColorSampleFromSequence(sequence);
    _assertAuthoredVisitMarkOrder({
      marks,
      input,
    });
    assert.deepEqual(
      marks.slice(0, 3).map((match) => {
        return match[2];
      }),
      expectedColors,
    );
    const reordered = {
      ...input,
      participants: input.participants.map((person) => {
        return { ...person, records: [...person.records].reverse() };
      }),
    };
    assert.equal(_render({ frame: 150, input: reordered }), markup);
    const allRecords = _render({
      frame: 150,
      input: { ...input, emphasis: "all-records" },
    });
    const people = (svg: string) => {
      return Array.from(
        svg.matchAll(/data-cohort-person="[^"]*" transform="[^"]*"/g),
        (match) => {
          return match[0];
        },
      );
    };
    assert.deepEqual(people(markup), people(allRecords));
    assert.equal((markup.match(/data-denominator="6"/g) ?? []).length, 3);
  });
});
