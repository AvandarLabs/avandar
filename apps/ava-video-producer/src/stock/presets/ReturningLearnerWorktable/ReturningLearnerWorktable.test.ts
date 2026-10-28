/** Behavioral conservation and physical choreography assertions. */
import assert from "node:assert/strict";
import test from "node:test";
import { prop, propEq } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ReturningLearnerWorktable } from "./ReturningLearnerWorktable";
import {
  newActivitiesInput,
  changedInput,
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
  denseInput,
} from "./ReturningLearnerWorktable.fixtures";
import type { PresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
function _render({
  frame,
  input,
}: Readonly<{ frame: number; input: Input }>): string {
  return renderToStaticMarkup(
    createElement(ReturningLearnerWorktable, {
      frame,
      input,
      accent: "#81d7bd",
      id: "packet15",
    }),
  );
}
test("original portfolio identities and marks survive interruption and return", () => {
  [24, 72, 150].forEach((frame) => {
    const markup = _render({ frame: frame, input: changedInput });
    changedInput.priorWork.forEach((work) =>
      assert.equal(markup.split(`data-work-id="${work.id}"`).length - 1, 1),
    );
    assert.equal(markup.split('data-learner="true"').length - 1, 1);
  });
  const hold = _render({ frame: 150, input: changedInput });
  assert.equal([...hold.matchAll(/data-review-target="drawing"/g)].length, 2);
  assert.equal([...hold.matchAll(/data-new-activity="true"/g)].length, 1);
});

import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { getConservativeWidthFromText } from "../../text/getConservativeWidthFromText";
import { returningLearnerWorktableContract as contract } from "./ReturningLearnerWorktable.contract";
import { inputSchema, type Input } from "./ReturningLearnerWorktable.schema";
function _getVisibleTexts({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>): string[] {
  return [
    frame < 36
      ? input.periodLabels.before
      : frame < 72
        ? input.periodLabels.interruption
        : input.periodLabels.return,
    input.activityLabels.retained,
    input.people.learner,
    input.people.teacher,
    input.caption,
    ...input.priorWork.map(prop("label")),
    ...input.returnActivities.flatMap((activity, index) =>
      frame >= 106 + index * 16
        ? [activity.label, input.activityLabels[activity.kind]]
        : [],
    ),
  ];
}
const options = {
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  invalidInputs,
  contract,
  render: _render,
  excludedTextFields: ["id", "kind", "form", "priorWorkId"],
  getVisibleTexts: _getVisibleTexts,
  textFrames: [24, 72, 150],
} satisfies PresetAssertions<Input>;
registerStockPresetAssertions(options);
registerStockTextLayoutAssertions(options);
function _position({
  markup,
  marker,
}: {
  markup: string;
  marker: string;
}): number[] {
  const match = markup.match(
    new RegExp(
      `${marker}="[^"]+" transform="translate\\(([-.\\d]+) ([-.\\d]+)\\)"`,
    ),
  );
  assert.ok(match, marker);
  return [Number(match[1]), Number(match[2])];
}
test("the learner carries intact original geometry to the side table and back", () => {
  [denseInput, { ...denseInput, showPortfolioTrail: false }].forEach(
    (input) => {
      const initial = _render({ frame: 24, input: input });
      const interruption = _render({ frame: 64, input: input });
      const hold = _render({ frame: 150, input: input });
      const marks = (markup: string) =>
        [...markup.matchAll(/data-work-marks="([^"]+)" d="([^"]+)"/g)].map(
          (match) => match.slice(1),
        );
      assert.deepEqual(marks(initial), marks(interruption));
      assert.deepEqual(marks(initial), marks(hold));
      const original = _position({ markup: initial, marker: "data-work-id" });
      const away = _position({ markup: interruption, marker: "data-work-id" });
      assert.ok(away[0] - original[0] > 450);
      assert.deepEqual(
        _position({ markup: hold, marker: "data-work-id" }),
        original,
      );
      [
        35.999, 36, 36.001, 47.5, 59.999, 60, 60.001, 71.999, 72, 72.001, 81,
        89.999, 90, 90.001,
      ].forEach((frame) => {
        const markup = _render({ frame: frame, input: input });
        const work = _position({ markup, marker: "data-work-id" });
        const learner = _position({ markup, marker: "data-learner" });
        assert.equal(work[0] - 20, learner[0] + 35);
        assert.equal(work[1], learner[1] - 10);
        assert.ok(
          work[0] - 21 >= 0 &&
            work[0] + 121 <= 960 &&
            work[1] - 47 > 165 &&
            work[1] + 28 < 300,
        );
      });
    },
  );
});
test("each teacher placement has continuous hand contact and preserves independent new activities", () => {
  [denseInput, newActivitiesInput].forEach((input) => {
    input.returnActivities.forEach((activity, index) => {
      [94 + index * 16, 100.5 + index * 16, 106 + index * 16].forEach(
        (frame) => {
          const markup = _render({ frame: frame, input: input });
          const hand = markup.match(/data-teacher-hand="true" d="([^"]+)"/);
          assert.ok(hand);
          const coordinates = hand[1].match(/-?\d+(?:\.\d+)?/g)!.map(Number);
          const object = markup.match(
            new RegExp(
              `data-activity-object="${activity.id}"[^>]*transform="translate\\(([-.\\d]+) ([-.\\d]+)\\)"`,
            ),
          );
          assert.ok(object);
          assert.ok(Math.abs(coordinates.at(-2)! - Number(object[1])) < 0.001);
          assert.equal(coordinates.at(-1), Number(object[2]) - 23);
        },
      );
    });
    const markup = _render({ frame: 150, input: input });
    input.returnActivities
      .filter(propEq("kind", "new"))
      .forEach((activity) =>
        assert.ok(
          markup.includes(
            `data-activity-object="${activity.id}" data-new-activity="true"`,
          ),
        ),
      );
  });
  assert.equal(
    [
      ..._render({ frame: 150, input: newActivitiesInput }).matchAll(
        /data-new-activity="true"/g,
      ),
    ].length,
    3,
  );
  assert.doesNotMatch(
    _render({ frame: 150, input: newActivitiesInput }),
    /data-review-target=/,
  );
});
test("review references, new empty references and exact bounds remain strict", () => {
  [
    undefined,
    {},
    { ...DEFAULT_INPUT, people: { ...DEFAULT_INPUT.people, learner: "" } },
    {
      ...DEFAULT_INPUT,
      returnActivities: [{ ...DEFAULT_INPUT.returnActivities[1], extra: true }],
    },
    {
      ...DEFAULT_INPUT,
      returnActivities: [
        { ...DEFAULT_INPUT.returnActivities[0], label: "x".repeat(29) },
      ],
    },
  ].forEach((value) =>
    assert.equal(inputSchema.safeParse(value).success, false),
  );
  assert.ok(
    contract.semanticRules.some(
      (rule) =>
        rule.paths.includes("returnActivities.*.priorWorkId") &&
        rule.description.includes("Multiple reviews"),
    ),
  );
  assert.deepEqual(inputSchema.parse(newActivitiesInput), newActivitiesInput);
});
test("the optional portfolio trail clears the complete moving learner caption", () => {
  const markup = _render({ frame: 64, input: denseInput });
  const trail = markup.match(
    /data-portfolio-trail="true" d="M[-.\d]+ ([-.\d]+) H[-.\d]+"/,
  );
  assert.ok(trail);
  const label = markup.match(
    /<text[^>]*x="670"[^>]*y="193"[^>]*>(.*?)<\/text>/,
  );
  assert.ok(label);
  const numLines = [...label[1].matchAll(/<tspan/g)].length;
  const y = Number(trail[1]);
  assert.ok(y <= 193 - 14 - 5 || y >= 193 + (numLines - 1) * 18.2 + 8);
});
test("the learner caption stays clear of the numbered original portfolio", () => {
  const input = {
    ...denseInput,
    people: { ...denseInput.people, learner: "W".repeat(20) },
  };
  [24, 48, 64, 81, 150].forEach((frame) => {
    const markup = _render({ frame: frame, input: input });
    const label = markup.match(
      /<text[^>]*x="([-.\d]+)"[^>]*y="193"[^>]*>(.*?)<\/text>/,
    );
    assert.ok(label);
    const widths = [...label[2].matchAll(/<tspan[^>]*>(.*?)<\/tspan>/g)].map(
      (line) => getConservativeWidthFromText({ text: line[1], fontSize: 14 }),
    );
    const work = _position({ markup, marker: "data-work-id" });
    assert.ok(Number(label[1]) + Math.max(...widths) / 2 <= work[0] - 25);
  });
});
