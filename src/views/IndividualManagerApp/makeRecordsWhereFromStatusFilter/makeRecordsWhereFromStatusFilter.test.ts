import { describe, expect, it } from "vitest";
import { makeRecordsWhereFromStatusFilter } from "@/views/IndividualManagerApp/makeRecordsWhereFromStatusFilter/makeRecordsWhereFromStatusFilter";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";

const CONCEPT_ID = "00000000-0000-4000-8000-0000000000c1" as Concept.Id;
const SUSPECTED_ID =
  "00000000-0000-4000-8000-0000000000a1" as ConceptStatus.Id;
const CONFIRMED_ID =
  "00000000-0000-4000-8000-0000000000a2" as ConceptStatus.Id;

describe("makeRecordsWhereFromStatusFilter", () => {
  it("filters by case type alone when no status is chosen", () => {
    expect(
      makeRecordsWhereFromStatusFilter({
        conceptId: CONCEPT_ID,
        statusIds: [],
      }),
    ).toEqual({ where: { concept_id: { eq: CONCEPT_ID } } });
  });

  it("lists the chosen statuses in one order however they were picked", () => {
    expect(
      makeRecordsWhereFromStatusFilter({
        conceptId: CONCEPT_ID,
        statusIds: [CONFIRMED_ID, SUSPECTED_ID],
      }),
    ).toEqual({
      where: {
        concept_id: { eq: CONCEPT_ID },
        status_id: { in: [SUSPECTED_ID, CONFIRMED_ID] },
      },
    });
  });
});
