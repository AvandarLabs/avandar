import { prop } from "@avandar/utils";
import { describe, expect, it } from "vitest";
import { groupRecordsByCaseType } from "@/views/IndividualManagerApp/groupRecordsByCaseType/groupRecordsByCaseType";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { Individual } from "$/models/ontology/Individual/Individual";

const CASES = "00000000-0000-4000-8000-0000000000c1" as Concept.Id;
const CONTACTS = "00000000-0000-4000-8000-0000000000c2" as Concept.Id;

function _record(id: string, conceptId: Concept.Id): Individual.T {
  return {
    assignedTo: "00000000-0000-4000-8000-0000000000b1",
    conceptId,
    createdAt: "2026-11-01T00:00:00.000Z",
    externalId: id,
    id: id as Individual.Id,
    missingFromSourceAt: undefined,
    name: id,
    statusId:
      "00000000-0000-4000-8000-0000000000a1" as Individual.T["statusId"],
    updatedAt: "2026-11-01T00:00:00.000Z",
    workspaceId:
      "00000000-0000-4000-8000-0000000000e1" as Individual.T["workspaceId"],
  };
}

describe("groupRecordsByCaseType", () => {
  it("keeps the first case type first and appends later rows of it", () => {
    const groups = groupRecordsByCaseType([
      _record("a", CASES),
      _record("b", CONTACTS),
      _record("c", CASES),
    ]);

    const namesOf = (group: { records: Individual.T[] } | undefined) => {
      return group?.records.map(prop("name"));
    };

    expect(groups.map(prop("conceptId"))).toEqual([CASES, CONTACTS]);
    expect(namesOf(groups[0])).toEqual(["a", "c"]);
    expect(namesOf(groups[1])).toEqual(["b"]);
  });

  it("returns no groups for no records", () => {
    expect(groupRecordsByCaseType([])).toEqual([]);
  });
});
