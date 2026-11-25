import { FIXTURES } from "../../SharedJigPreparation.fixtures";
import { inputSchema } from "../../SharedJigPreparation.schema";
import { assertMarkingHandsContactSelectedId as _assertMarkingHandsContactSelectedId } from "./assertMarkingHandsContactSelectedId";

/**
 * Asserts marking hands contact the selected cutout and paint above the
 * opaque guide.
 */
export function assertMarkingHandsContactSelectedFixture({
  fixture,
  pattern,
}: Readonly<{
  fixture: (typeof FIXTURES)[number]["input"];
  pattern: string;
}>): void {
  const input = inputSchema.parse({
    ...fixture,
    guide: { ...fixture.guide, pattern },
  });
  const duration = 73 / input.collaborators.length;
  input.collaborators.forEach(({ id }, index) => {
    return _assertMarkingHandsContactSelectedId({
      id,
      index,
      duration,
      input,
      pattern,
    });
  });
}
