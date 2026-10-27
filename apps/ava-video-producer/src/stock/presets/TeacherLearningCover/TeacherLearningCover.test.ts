/** Behavioral conservation and physical choreography assertions. */
import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TeacherLearningCover } from "./TeacherLearningCover";
import {
  changedInput,
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
  denseInput,
  minimumInput,
} from "./TeacherLearningCover.fixtures";
import type { PresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
function _render({
  frame,
  input,
}: Readonly<{ frame: number; input: Input }>): string {
  return renderToStaticMarkup(
    createElement(TeacherLearningCover, {
      frame,
      input,
      accent: "#81d7bd",
      id: "packet15",
    }),
  );
}
test("cover physically arrives before teacher departure and stays through return", () => {
  [47.999, 48, 48.001, 103.999, 104, 104.001, 127.999, 128, 128.001].forEach(
    (frame) => {
      const markup = _render({ frame: frame, input: changedInput });
      const teacher = markup.match(
        /data-staff-role="teacher"[^>]*transform="translate\(([-.\d]+) ([-.\d]+)\)"/,
      );
      const cover = markup.match(
        /data-staff-role="cover"[^>]*transform="translate\(([-.\d]+) ([-.\d]+)\)"/,
      );
      assert.ok(teacher);
      assert.ok(cover);
      if (Number(teacher[1]) > 520) {
        assert.ok(Number(cover[1]) >= 70 && Number(cover[1]) <= 480);
      }
      assert.equal([...markup.matchAll(/data-learner-id=/g)].length, 6);
    },
  );
});

import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { teacherLearningCoverContract as contract } from "./TeacherLearningCover.contract";
import { inputSchema, type Input } from "./TeacherLearningCover.schema";
function _getVisibleTexts({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>): string[] {
  return [
    input.roomLabels.classroom,
    input.roomLabels.supportSpace,
    input.session.prompt,
    input.session.label,
    input.caption,
    frame < 48
      ? input.phaseLabels.cover
      : frame < 104
        ? input.phaseLabels.support
        : input.phaseLabels.return,
    ...Object.values(input.staff).map(prop("label")),
    ...input.learners.map(prop("label")),
  ];
}
const options = {
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  invalidInputs,
  contract,
  render: _render,
  excludedTextFields: ["id", "mode"],
  getVisibleTexts: _getVisibleTexts,
  textFrames: [24, 72, 150],
} satisfies PresetAssertions<Input>;
registerStockPresetAssertions(options);
registerStockTextLayoutAssertions(options);
function _staffX({ markup, role }: { markup: string; role: string }): number {
  const match = markup.match(
    new RegExp(
      `data-staff-role="${role}"[^>]*transform="translate\\(([-.\\d]+) ([-.\\d]+)\\)"`,
    ),
  );
  assert.ok(match);
  assert.equal(Number(match[2]), 250);
  return Number(match[1]);
}
test("full adult shapes cover every fractional handoff and the six learner identities never change", () => {
  (["rehearsal", "co-planning"] as const).forEach((mode) => {
    [true, false].forEach((showClassroomResponsibility) => {
      const input = {
        ...denseInput,
        session: { ...denseInput.session, mode },
        showClassroomResponsibility,
      };
      Array.from({ length: 361 }, (_, index) => index / 2).forEach((frame) => {
        const markup = _render({ frame: frame, input: input });
        const teacherX = _staffX({ markup, role: "teacher" });
        const coverX = _staffX({ markup, role: "cover" });
        assert.ok(
          (teacherX - 16 >= 90 && teacherX + 16 <= 530) ||
            (coverX - 16 >= 90 && coverX + 16 <= 530),
        );
        if (frame > 48 && frame < 124) {
          assert.equal(coverX, 180);
        }
        assert.deepEqual(
          [...markup.matchAll(/data-learner-id="([^"]+)"/g)].map(
            (match) => match[1],
          ),
          input.learners.map(prop("id")),
        );
        assert.equal(
          markup.includes("data-responsibility="),
          showClassroomResponsibility,
        );
      });
      [24, 42, 48, 72, 104, 124, 132, 150].forEach((boundary) => {
        const before = _render({ frame: boundary - 0.001, input: input });
        const after = _render({ frame: boundary + 0.001, input: input });
        ["teacher", "cover"].forEach((role) =>
          assert.ok(
            Math.abs(
              _staffX({ markup: before, role }) -
                _staffX({ markup: after, role }),
            ) < 0.001,
          ),
        );
      });
      assert.equal(
        _staffX({
          markup: _render({ frame: 42, input: input }),
          role: "cover",
        }),
        180,
      );
      assert.equal(
        _staffX({
          markup: _render({ frame: 48, input: input }),
          role: "teacher",
        }),
        360,
      );
      assert.equal(
        _staffX({
          markup: _render({ frame: 124, input: input }),
          role: "teacher",
        }),
        360,
      );
      assert.equal(
        _staffX({
          markup: _render({ frame: 132, input: input }),
          role: "cover",
        }),
        180,
      );
    });
  });
});
test("both support modes contact the teaching board with different physical gestures", () => {
  const hands = (markup: string) => [
    ...markup.matchAll(/data-teaching-hand="([^"]+)" d="([^"]+)"/g),
  ];
  const rehearsal = hands(_render({ frame: 80, input: denseInput }));
  const planning = hands(
    _render({
      frame: 80,
      input: {
        ...denseInput,
        session: { ...denseInput.session, mode: "co-planning" },
      },
    }),
  );
  assert.equal(rehearsal.length, 2);
  assert.equal(planning.length, 2);
  assert.notDeepEqual(
    rehearsal.map((match) => match[2]),
    planning.map((match) => match[2]),
  );
  [rehearsal, planning].forEach((gestures) =>
    gestures.forEach((gesture) => {
      const coordinates = gesture[2].match(/-?\d+(?:\.\d+)?/g)!.map(Number);
      const x = (gesture[1] === "teacher" ? 660 : 850) + coordinates.at(-2)!;
      assert.ok(x >= 592 && x <= 908);
      assert.equal(250 + coordinates.at(-1)!, 300);
    }),
  );
  assert.ok(
    _render({ frame: 150, input: denseInput }).includes(
      `aria-label="${denseInput.session.prompt}"`,
    ),
  );
});
test("staff role identity and exact collection bounds survive contract serialization", () => {
  [
    undefined,
    {},
    { ...DEFAULT_INPUT, learners: [DEFAULT_INPUT.learners[0]] },
    {
      ...denseInput,
      learners: [...denseInput.learners, { id: "seventh", label: "L" }],
    },
    {
      ...DEFAULT_INPUT,
      staff: {
        ...DEFAULT_INPUT.staff,
        mentor: { ...DEFAULT_INPUT.staff.mentor, id: "" },
      },
    },
    { ...minimumInput, session: { ...DEFAULT_INPUT.session, extra: true } },
  ].forEach((value) =>
    assert.equal(inputSchema.safeParse(value).success, false),
  );
  const rules = JSON.parse(
    JSON.stringify(contract.semanticRules),
  ) as typeof contract.semanticRules;
  assert.ok(
    rules.some(
      (rule) =>
        rule.paths.includes("staff.cover.id") &&
        rule.description.includes("distinct"),
    ),
  );
});
test("every accepted learner count remains independent from staff and session mode", () => {
  [2, 3, 4, 5, 6].forEach((numLearners) => {
    const input = {
      ...denseInput,
      learners: denseInput.learners.slice(0, numLearners),
    };
    [24, 80, 110, 150].forEach((frame) => {
      const markup = _render({ frame: frame, input: inputSchema.parse(input) });
      assert.equal(
        [...markup.matchAll(/data-learner-id=/g)].length,
        numLearners,
      );
      assert.equal([...markup.matchAll(/data-staff-id=/g)].length, 3);
    });
  });
});
