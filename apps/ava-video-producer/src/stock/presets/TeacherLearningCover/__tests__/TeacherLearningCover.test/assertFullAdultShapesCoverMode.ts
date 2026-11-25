import { assertFullAdultShapesCoverShowClassroomResponsibility as _assertFullAdultShapesCoverShowClassroomResponsibility } from "./assertFullAdultShapesCoverShowClassroomResponsibility";

/**
 * Asserts full adult shapes cover every fractional handoff and the six
 * learner identities never change.
 */
export function assertFullAdultShapesCoverMode(
  mode: "rehearsal" | "co-planning",
): void {
  [true, false].forEach((showClassroomResponsibility) => {
    return _assertFullAdultShapesCoverShowClassroomResponsibility({
      showClassroomResponsibility,
      mode,
    });
  });
}
