import { beforeEach, describe, expect, it, vi } from "vitest";
import { getIndividualsByExternalIds } from "@/clients/qetl/QueryMediator/conceptRelation/getIndividualsByExternalIds/getIndividualsByExternalIds";
import type { Concept } from "$/models/ontology/Concept/Concept";

const CONCEPT_ID = "cccccccc-3333-4333-8333-cccccccccccc" as Concept.Id;

const { individualGetAllMock } = vi.hoisted(() => {
  return { individualGetAllMock: vi.fn() };
});

vi.mock("@/clients/ontology/IndividualClient", () => {
  return { IndividualClient: { getAll: individualGetAllMock } };
});

/** The `where` of every Postgres read, in call order. */
function _getReadFilters(): unknown[] {
  return individualGetAllMock.mock.calls.map((call) => {
    return (call[0] as { where: unknown }).where;
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  individualGetAllMock.mockResolvedValue([]);
});

describe("getIndividualsByExternalIds", () => {
  // The keys travel in the request URL, so one read names a bounded number.
  it("reads at most 50 keys per Postgres read", async () => {
    const externalIds = Array.from({ length: 120 }, (_, index) => {
      return `p${index}`;
    });

    await getIndividualsByExternalIds({ conceptId: CONCEPT_ID, externalIds });

    expect(
      _getReadFilters().map((filter) => {
        return (filter as { external_id: { in: string[] } }).external_id.in
          .length;
      }),
    ).toEqual([50, 50, 20]);
  });

  // postgrest-js does not escape `"` or `\` inside an `in` list, so such a
  // key could be read as a different one. An equality filter takes it
  // verbatim.
  it("reads a key holding a double quote or a backslash with an equality filter of its own", async () => {
    await getIndividualsByExternalIds({
      conceptId: CONCEPT_ID,
      externalIds: ["p1", '5" pipe', "a\\b"],
    });

    expect(_getReadFilters()).toEqual([
      { concept_id: { eq: CONCEPT_ID }, external_id: { in: ["p1"] } },
      { concept_id: { eq: CONCEPT_ID }, external_id: { eq: '5" pipe' } },
      { concept_id: { eq: CONCEPT_ID }, external_id: { eq: "a\\b" } },
    ]);
  });

  it("reads each key once when the caller names it twice", async () => {
    await getIndividualsByExternalIds({
      conceptId: CONCEPT_ID,
      externalIds: ["p1", "p1", "p2"],
    });

    expect(_getReadFilters()).toEqual([
      { concept_id: { eq: CONCEPT_ID }, external_id: { in: ["p1", "p2"] } },
    ]);
  });

  it("returns the records every read found", async () => {
    individualGetAllMock
      .mockResolvedValueOnce([{ externalId: "p1" }])
      .mockResolvedValueOnce([{ externalId: '5" pipe' }]);

    const records = await getIndividualsByExternalIds({
      conceptId: CONCEPT_ID,
      externalIds: ["p1", '5" pipe'],
    });

    expect(
      records.map((record) => {
        return record.externalId;
      }),
    ).toEqual(["p1", '5" pipe']);
  });

  it("reads nothing when no key is named", async () => {
    const records = await getIndividualsByExternalIds({
      conceptId: CONCEPT_ID,
      externalIds: [],
    });

    expect(records).toEqual([]);
    expect(individualGetAllMock).not.toHaveBeenCalled();
  });
});
