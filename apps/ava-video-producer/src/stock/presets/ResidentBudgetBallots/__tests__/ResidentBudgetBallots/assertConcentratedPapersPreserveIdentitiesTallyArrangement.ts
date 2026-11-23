import { assertConcentratedPapersPreserveIdentitiesProjectId as _assertConcentratedPapersPreserveIdentitiesProjectId } from "./assertConcentratedPapersPreserveIdentitiesProjectId";

/**
 * Asserts concentrated papers preserve all identities and disjoint final
 * envelopes.
 */
export function assertConcentratedPapersPreserveIdentitiesTallyArrangement(
  tallyArrangement: "stacks" | "rows",
): void {
  return [null, "bench"].forEach((projectId) => {
    return _assertConcentratedPapersPreserveIdentitiesProjectId({
      projectId,
      tallyArrangement,
    });
  });
}
