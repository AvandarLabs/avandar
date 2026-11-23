import { TeacherLearningCoverTestState } from "./TeacherLearningCoverTestState";

const { render: _render, staffX: _staffX } = TeacherLearningCoverTestState;

import assert from "node:assert/strict";
import { type Input } from "../../TeacherLearningCover.schema";

/** Asserts an independently authored portion of the rendered contract. */
export function assertFullAdultShapesCoverInput(input: Readonly<Input>): void {
  [24, 42, 48, 72, 104, 124, 132, 150].forEach((boundary) => {
    const before = _render({ frame: boundary - 0.001, input: input });
    const after = _render({ frame: boundary + 0.001, input: input });
    ["teacher", "cover"].forEach((role) => {
      return assert.ok(
        Math.abs(
          _staffX({ markup: before, role }) - _staffX({ markup: after, role }),
        ) < 0.001,
      );
    });
  });
  assert.equal(
    _staffX({ markup: _render({ frame: 42, input: input }), role: "cover" }),
    180,
  );
  assert.equal(
    _staffX({ markup: _render({ frame: 48, input: input }), role: "teacher" }),
    360,
  );
}
