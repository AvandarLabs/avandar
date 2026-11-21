import { TeacherLearningCoverTestState } from "./TeacherLearningCoverTestState";

const { render: _render, staffX: _staffX } = TeacherLearningCoverTestState;
import assert from "node:assert/strict";
import { prop } from "@avandar/utils";
import { type Input } from "../../TeacherLearningCover.schema";
import { assertFullAdultShapesCoverInput as _assertFullAdultShapesCoverInput } from "./assertFullAdultShapesCoverInput";

/**
 * Asserts full adult shapes cover every fractional handoff and the six
 * learner identities never change.
 */
export function assertFullAdultShapesCoverInputIndex({
  input,
  showClassroomResponsibility,
}: Readonly<{
  input: Readonly<Input>;
  showClassroomResponsibility: boolean;
}>): void {
  Array.from({ length: 361 }, (_, index) => {
    return index / 2;
  }).forEach((frame) => {
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
      [...markup.matchAll(/data-learner-id="([^"]+)"/g)].map((match) => {
        return match[1];
      }),
      input.learners.map(prop("id")),
    );
    assert.equal(
      markup.includes("data-responsibility="),
      showClassroomResponsibility,
    );
  });
  _assertFullAdultShapesCoverInput(input);
}
