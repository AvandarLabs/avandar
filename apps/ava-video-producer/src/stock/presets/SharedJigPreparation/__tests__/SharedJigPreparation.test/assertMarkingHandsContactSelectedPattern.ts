import { FIXTURES } from "../../SharedJigPreparation.fixtures";
import { assertMarkingHandsContactSelectedFixture as _assertMarkingHandsContactSelectedFixture } from "./assertMarkingHandsContactSelectedFixture";

/** Asserts the independently authored rendered test contract. */
export function assertMarkingHandsContactSelectedPattern(
  pattern: string,
): void {
  FIXTURES.forEach(({ input: fixture }) => {
    return _assertMarkingHandsContactSelectedFixture({ fixture, pattern });
  });
}
