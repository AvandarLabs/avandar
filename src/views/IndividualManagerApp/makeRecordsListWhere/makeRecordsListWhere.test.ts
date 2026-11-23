import { describe, expect, it } from "vitest";
import { makeRecordsListWhere } from "@/views/IndividualManagerApp/makeRecordsListWhere/makeRecordsListWhere";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";
import type { User } from "$/models/User/User";

const CONCEPT_ID = "00000000-0000-4000-8000-0000000000c1" as Concept.Id;
const SUSPECTED_ID = "00000000-0000-4000-8000-0000000000a1" as ConceptStatus.Id;
const CONFIRMED_ID = "00000000-0000-4000-8000-0000000000a2" as ConceptStatus.Id;
const MEMBER_ID = "00000000-0000-4000-8000-0000000000b1" as User.Id;

describe("makeRecordsListWhere", () => {
  it("filters by case type alone when no status or assignee is chosen", () => {
    expect(
      makeRecordsListWhere({
        conceptId: CONCEPT_ID,
        statusIds: [],
        assignee: { kind: "anyone" },
      }),
    ).toEqual({ where: { concept_id: { eq: CONCEPT_ID } } });
  });

  it("lists the chosen statuses in one order however they were picked", () => {
    expect(
      makeRecordsListWhere({
        conceptId: CONCEPT_ID,
        statusIds: [CONFIRMED_ID, SUSPECTED_ID],
        assignee: { kind: "anyone" },
      }),
    ).toEqual({
      where: {
        concept_id: { eq: CONCEPT_ID },
        status_id: { in: [SUSPECTED_ID, CONFIRMED_ID] },
      },
    });
  });

  it("matches records with an empty assignee", () => {
    expect(
      makeRecordsListWhere({
        conceptId: CONCEPT_ID,
        statusIds: [],
        assignee: { kind: "unassigned" },
      }),
    ).toEqual({
      where: {
        concept_id: { eq: CONCEPT_ID },
        assigned_to: { is: null },
      },
    });
  });

  it("matches records assigned to one member, including a status filter", () => {
    expect(
      makeRecordsListWhere({
        conceptId: CONCEPT_ID,
        statusIds: [SUSPECTED_ID],
        assignee: { kind: "member", userId: MEMBER_ID },
      }),
    ).toEqual({
      where: {
        concept_id: { eq: CONCEPT_ID },
        status_id: { in: [SUSPECTED_ID] },
        assigned_to: { eq: MEMBER_ID },
      },
    });
  });
});
