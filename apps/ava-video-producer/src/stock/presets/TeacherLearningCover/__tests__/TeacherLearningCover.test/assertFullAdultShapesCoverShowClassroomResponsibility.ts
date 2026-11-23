import { TeacherLearningCoverTestState } from "./TeacherLearningCoverTestState";

const { render: _render, staffX: _staffX } = TeacherLearningCoverTestState;
import assert from "node:assert/strict";
import { denseInput } from "../../TeacherLearningCover.fixtures";
import { assertFullAdultShapesCoverInputIndex as _assertFullAdultShapesCoverInputIndex } from "./assertFullAdultShapesCoverInputIndex";

/**
 * Asserts full adult shapes cover every fractional handoff and the six
 * learner identities never change.
 */
export function assertFullAdultShapesCoverShowClassroomResponsibility({
  showClassroomResponsibility,
  mode,
}: Readonly<{
  showClassroomResponsibility: boolean;
  mode: "rehearsal" | "co-planning";
}>): void {
  const input = {
    ...denseInput,
    session: { ...denseInput.session, mode },
    showClassroomResponsibility,
  };
  _assertFullAdultShapesCoverInputIndex({ input, showClassroomResponsibility });
  assert.equal(
    _staffX({ markup: _render({ frame: 124, input: input }), role: "teacher" }),
    360,
  );
  assert.equal(
    _staffX({ markup: _render({ frame: 132, input: input }), role: "cover" }),
    180,
  );
}
