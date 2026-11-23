import { describe, expect, it } from "vitest";
import { filterToKnownStatusIds } from "@/views/IndividualManagerApp/IndividualNavbar/filterToKnownStatusIds/filterToKnownStatusIds";
import type { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";

const SUSPECTED_ID = "00000000-0000-4000-8000-0000000000a1" as ConceptStatus.Id;
const CONFIRMED_ID = "00000000-0000-4000-8000-0000000000a2" as ConceptStatus.Id;
const DELETED_ID = "00000000-0000-4000-8000-0000000000a3" as ConceptStatus.Id;

describe("filterToKnownStatusIds", () => {
  it("drops a picked status the case type no longer has", () => {
    expect(
      filterToKnownStatusIds({
        statusIds: [SUSPECTED_ID, DELETED_ID],
        statuses: [{ id: SUSPECTED_ID }, { id: CONFIRMED_ID }],
      }),
    ).toEqual([SUSPECTED_ID]);
  });

  it("filters by nothing once every picked status is gone", () => {
    expect(
      filterToKnownStatusIds({
        statusIds: [DELETED_ID],
        statuses: [{ id: SUSPECTED_ID }],
      }),
    ).toEqual([]);
  });
});
