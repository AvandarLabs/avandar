import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { VoluntaryFamilyReunion } from "./VoluntaryFamilyReunion";
import {
  DEFAULT_INPUT,
  CHANGED_INPUT,
  fixtures,
  invalidInputs,
  DENSE_INPUT,
  MINIMUM_INPUT,
} from "./VoluntaryFamilyReunion.fixtures";
function _render({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: typeof DEFAULT_INPUT }>): string {
  return renderToStaticMarkup(
    createElement(VoluntaryFamilyReunion, {
      frame,
      input,
      accent: "#9fefca",
      id: "test",
    }),
  );
}
test("two active acceptances precede travel and silhouettes remain distinct", () => {
  assert.equal(
    (_render({ frame: 45 }).match(/data-accepted="true"/g) ?? []).length,
    1,
  );
  assert.equal(
    (_render({ frame: 60 }).match(/data-accepted="true"/g) ?? []).length,
    2,
  );
  assert.equal(
    (_render({ frame: 150 }).match(/data-member=/g) ?? []).length,
    DEFAULT_INPUT.groups.flatMap(prop("members")).length,
  );
});

test("changed authored input emits its physical scene", () => {
  assert.notEqual(
    renderToStaticMarkup(
      createElement(VoluntaryFamilyReunion, {
        frame: 150,
        input: CHANGED_INPUT,
        accent: "#9fefca",
        id: "test",
      }),
    ),
    "",
  );
});

import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";
test("changed greeting changes actual arms and every member stays distinct after sequential acceptance", () => {
  const opened = _render({ frame: 150, input: CHANGED_INPUT });
  const waved = _render({
    frame: 150,
    input: { ...CHANGED_INPUT, greeting: "wave" },
  });
  assert.notEqual(
    opened.match(/<path data-greeting-arm[^>]*>/)?.[0],
    waved.match(/<path data-greeting-arm[^>]*>/)?.[0],
  );
  fixtures.forEach(({ input }) => {
    const people = (frame: number) => [
      ..._render({ frame: frame, input: input }).matchAll(
        /<g data-member="([^"]*)"[^>]*data-x="([^"]*)"/g,
      ),
    ];
    assert.deepEqual(
      people(24).map((person) => person[2]),
      people(59).map((person) => person[2]),
    );
    assert.notDeepEqual(
      people(59).map((person) => person[2]),
      people(80).map((person) => person[2]),
    );
    const final = people(150);
    assert.equal(final.length, input.groups.flatMap(prop("members")).length);
    assert.equal(new Set(final.map((person) => person[2])).size, final.length);
    assert.equal(
      (
        _render({ frame: 60, input: input }).match(/data-accepted="true"/g) ??
        []
      ).length,
      2,
    );
    [36, 54].forEach((frame) => {
      const markup = _render({ frame: frame, input: input });
      assert.match(markup, /data-accepting-hand/);
      assert.match(markup, /data-acceptance-mark/);
    });
  });
});

import { registerStockTextLayoutAssertions } from "../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { voluntaryFamilyReunionContract } from "./VoluntaryFamilyReunion.contract";
import { inputSchema, type Input } from "./VoluntaryFamilyReunion.schema";
function _getVisibleTexts({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>): string[] {
  return [
    input.scenarioCaption,
    input.meetingLabel,
    input.invitationLabels.heading,
    ...(frame >= 36 ? [input.invitationLabels.acceptance] : []),
    ...input.groups.flatMap((group) => [
      group.label,
      ...(input.showMemberLabels ? group.members.map(prop("label")) : []),
    ]),
  ];
}
const EXCLUDED_TEXT_FIELDS: string[] = ["id", "greeting"];
registerStockPresetAssertions({
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  invalidInputs,
  contract: voluntaryFamilyReunionContract,
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
test("minimum empty identifiers and maximum accepted collections stay schema-valid", () => {
  assert.deepEqual(inputSchema.parse(MINIMUM_INPUT), MINIMUM_INPUT);
  assert.deepEqual(inputSchema.parse(DENSE_INPUT), DENSE_INPUT);
});
test("each active acceptance hand contacts its invitation check mark", () => {
  [36, 54].forEach((frame) => {
    const markup = _render({ frame: frame });
    const hand = markup.match(/<circle data-accepting-hand[^>]*>/);
    assert.ok(hand);
    const marks = [
      ...markup.matchAll(/<path data-acceptance-mark[^>]*d="M([^ ]+) ([^ ]+)/g),
    ];
    const mark = marks.at(-1);
    assert.ok(mark);
    assert.equal(
      SvgAttributes.getNumberFromMarkup({ attributes: hand[0], name: "cx" }),
      Number(mark[1]) + 6,
    );
    assert.equal(
      SvgAttributes.getNumberFromMarkup({ attributes: hand[0], name: "cy" }),
      Number(mark[2]),
    );
  });
});
test("six emitted heads remain separated and turn toward the meeting", () => {
  const markup = _render({ frame: 150, input: DENSE_INPUT });
  const members = [
    ...markup.matchAll(
      /<g data-member="[^"]*"[^>]*data-x="([^"]*)"[^>]*>(.*?)<\/g>/g,
    ),
  ];
  assert.equal(members.length, 6);
  members.forEach((member, index) => {
    const head = member[2].match(/<circle[^>]*>/);
    assert.ok(head);
    assert.equal(
      SvgAttributes.getNumberFromMarkup({ attributes: head[0], name: "cx" }),
      Number(member[1]),
    );
    const facing = member[2].match(
      /data-facing[^>]*d="M([^ ]+) ([^ ]+) L([^ ]+) ([^"]+)"/,
    );
    assert.ok(facing);
    assert.equal(
      Math.sign(Number(facing[3]) - Number(facing[1])),
      index < 3 ? 1 : -1,
    );
  });
});
test("I5 every authored member arrives inside the actual meeting structure", () => {
  fixtures.forEach(({ input }) => {
    const markup = _render({ frame: 150, input: input });
    const structure = markup.match(
      /d="M70 405 H890 M([^ ]+) 340 V405 M([^ ]+) 340 V405/,
    );
    assert.ok(structure);
    const left = Number(structure[1]),
      right = Number(structure[2]);
    const heads = [
      ...markup.matchAll(/<g data-member="[^"]*"[^>]*>(.*?)<\/g>/g),
    ].map((member) => {
      const circle = member[1].match(/<circle[^>]*>/);
      assert.ok(circle);
      return SvgAttributes.getNumberFromMarkup({
        attributes: circle[0],
        name: "cx",
      });
    });
    heads.forEach((x) =>
      assert.ok(
        x - 8 > left && x + 8 < right,
        `member at ${x} outside ${left}..${right}`,
      ),
    );
  });
});
test("I5 sparse groups converge at one meeting rather than only enlarging its outline", () => {
  const positions = (frame: number) =>
    [
      ..._render({ frame: frame, input: MINIMUM_INPUT }).matchAll(
        /<g data-member="[^"]*" data-x="([^"]*)"/g,
      ),
    ].map((match) => Number(match[1]));
  const before = positions(24),
    after = positions(150);
  assert.equal(after.length, 2);
  assert.ok(Math.abs(after[1] - after[0]) <= 100);
  assert.ok(after[0] > before[0] + 100);
  assert.ok(after[1] < before[1] - 100);
});
