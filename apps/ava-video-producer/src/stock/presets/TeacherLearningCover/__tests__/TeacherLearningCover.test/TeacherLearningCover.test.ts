import { TeacherLearningCoverTestState } from "./TeacherLearningCoverTestState";

const { render: _render, options } = TeacherLearningCoverTestState;
import assert from "node:assert/strict";
import test from "node:test";
import { registerStockPresetAssertions } from "../../../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { teacherLearningCoverContract as contract } from "../../TeacherLearningCover.contract";
import {
  changedInput,
  DEFAULT_INPUT,
  denseInput,
  minimumInput,
} from "../../TeacherLearningCover.fixtures";
import { inputSchema } from "../../TeacherLearningCover.schema";
import { assertFullAdultShapesCoverMode as _assertFullAdultShapesCoverMode } from "./assertFullAdultShapesCoverMode";

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

registerStockPresetAssertions(options);

registerStockTextLayoutAssertions(options);

test("full adult shapes cover every fractional handoff and the six learner identities never change", () => {
  (["rehearsal", "co-planning"] as const).forEach((mode) => {
    return _assertFullAdultShapesCoverMode(mode);
  });
});

test("both support modes contact the teaching board with different physical gestures", () => {
  const hands = (markup: string) => {
    return [...markup.matchAll(/data-teaching-hand="([^"]+)" d="([^"]+)"/g)];
  };
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
    rehearsal.map((match) => {
      return match[2];
    }),
    planning.map((match) => {
      return match[2];
    }),
  );
  [rehearsal, planning].forEach((gestures) => {
    return gestures.forEach((gesture) => {
      const coordinates = gesture[2].match(/-?\d+(?:\.\d+)?/g)!.map(Number);
      const x = (gesture[1] === "teacher" ? 660 : 850) + coordinates.at(-2)!;
      assert.ok(x >= 592 && x <= 908);
      assert.equal(250 + coordinates.at(-1)!, 300);
    });
  });
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
  ].forEach((value) => {
    return assert.equal(inputSchema.safeParse(value).success, false);
  });
  // This assertion exercises the JSON serialization boundary of the public
  // contract.
  // react-doctor-disable-next-line no-json-parse-stringify-clone
  const rules = JSON.parse(
    JSON.stringify(contract.semanticRules),
  ) as typeof contract.semanticRules;
  assert.ok(
    rules.some((rule) => {
      return (
        rule.paths.includes("staff.cover.id") &&
        rule.description.includes("distinct")
      );
    }),
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
