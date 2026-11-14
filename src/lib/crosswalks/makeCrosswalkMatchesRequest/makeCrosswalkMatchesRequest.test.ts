import { describe, expect, it } from "vitest";
import {
  DOB,
  makeColumnFill,
  makeMeaningDraft,
  MEANING_CONTEXT,
  MEANING_SOURCES_BY_NAME,
  MEANING_TARGETS,
  QUEENS_LAYOUT,
  REFERENCE_LAYOUT,
  SEX,
} from "@/lib/crosswalks/__tests__/meaningMatchFixtures";
import {
  makeCrosswalkMatchesRequest,
  toCrosswalkMeaningMatches,
} from "@/lib/crosswalks/makeCrosswalkMatchesRequest/makeCrosswalkMatchesRequest";
import type { CrosswalkMapping } from "$/models/crosswalks/CrosswalkMapping/CrosswalkMapping";
import type { CrosswalkDraft } from "@/lib/crosswalks/CrosswalkDraft/CrosswalkDraft";

function _request(draft: CrosswalkDraft.T = makeMeaningDraft()) {
  return makeCrosswalkMatchesRequest({
    draft,
    layoutId: QUEENS_LAYOUT,
    datasetsById: MEANING_CONTEXT.datasetsById,
    targets: MEANING_TARGETS,
    profilesBySourceColumn: MEANING_SOURCES_BY_NAME,
    locale: "en",
    model: "online",
  });
}

function _names(draft?: CrosswalkDraft.T): string[] | undefined {
  return _request(draft)?.request.columns.map((column) => {
    return column.name;
  });
}

function _withFill(
  columnId: string,
  fill: CrosswalkMapping.Fill,
): CrosswalkDraft.T {
  const draft = makeMeaningDraft();
  return {
    ...draft,
    mappings: {
      ...draft.mappings,
      [QUEENS_LAYOUT]: {
        ...draft.mappings[QUEENS_LAYOUT],
        [columnId]: {
          id: "b0000000-0000-4000-8000-0000000000ff" as CrosswalkMapping.Id,
          fill,
          status: "confirmed",
          confidence: undefined,
          reason: undefined,
        },
      },
    },
  };
}

describe("makeCrosswalkMatchesRequest", () => {
  it("asks about the unfilled columns and the layout's unused columns", () => {
    const result = _request();

    // case_id is filled from CaseNo, so neither is asked about.
    expect(result?.request.columns).toEqual([
      {
        name: "sex",
        otherNames: [],
        kind: "categorical",
        values: ["Male", "Female"],
      },
      { name: "dob", otherNames: [], kind: "date", values: [] },
      {
        name: "GENDER",
        otherNames: [],
        kind: "categorical",
        values: ["1", "2"],
      },
      expect.objectContaining({ name: "birth_date", values: [] }),
      // Named after a person, so its values stay here.
      expect.objectContaining({ name: "patient_name", values: [] }),
    ]);
    expect(result?.columnIdByName).toEqual(
      new Map([
        ["sex", SEX],
        ["dob", DOB],
      ]),
    );
    expect(result?.sourceNames).toEqual(
      new Set(["GENDER", "birth_date", "patient_name"]),
    );
  });

  it("leaves out a layout column named like a combined-dataset column", () => {
    const draft = makeMeaningDraft();
    const renamed: CrosswalkDraft.T = {
      ...draft,
      layouts: draft.layouts.map((layout) => {
        return layout.id === QUEENS_LAYOUT
          ? { ...layout, columnNames: ["CaseNo", " SEX", "birth_date"] }
          : layout;
      }),
    };

    expect(_names(renamed)).toEqual(["sex", "dob", "birth_date"]);
  });

  it("counts a Combine expression's columns as used", () => {
    const draft = _withFill(DOB, {
      kind: "expression",
      sql: "concat({Patient_Name}, '')",
    });

    expect(_names(draft)).toEqual(["sex", "GENDER", "birth_date"]);
  });

  it("counts a fill set to a fixed value or left empty as filled", () => {
    const draft = _withFill(SEX, { kind: "empty" });

    expect(_names(draft)).toEqual([
      "dob",
      "GENDER",
      "birth_date",
      "patient_name",
    ]);
  });

  it("asks nothing once every column of the combined dataset is filled", () => {
    const filled = _withFill(SEX, makeColumnFill("GENDER"));
    const draft: CrosswalkDraft.T = {
      ...filled,
      mappings: {
        ...filled.mappings,
        [QUEENS_LAYOUT]: {
          ...filled.mappings[QUEENS_LAYOUT],
          [DOB]: {
            ...filled.mappings[QUEENS_LAYOUT]![SEX]!,
            fill: { kind: "empty" },
          },
        },
      },
    };

    expect(_request(draft)).toBeUndefined();
  });

  it("asks nothing for the reference layout", () => {
    expect(
      makeCrosswalkMatchesRequest({
        draft: makeMeaningDraft(),
        layoutId: REFERENCE_LAYOUT,
        datasetsById: MEANING_CONTEXT.datasetsById,
        targets: MEANING_TARGETS,
        profilesBySourceColumn: MEANING_SOURCES_BY_NAME,
        locale: "en",
        model: "online",
      }),
    ).toBeUndefined();
  });

  it("names a column it has no profile for by the dataset's type", () => {
    const result = makeCrosswalkMatchesRequest({
      draft: makeMeaningDraft(),
      layoutId: QUEENS_LAYOUT,
      datasetsById: MEANING_CONTEXT.datasetsById,
      targets: [],
      profilesBySourceColumn: new Map(),
      locale: "en",
      model: "online",
    });

    expect(
      result?.request.columns.map((column) => {
        return [column.name, column.kind];
      }),
    ).toEqual([
      ["sex", "text"],
      ["dob", "date"],
      ["GENDER", "number"],
      ["birth_date", "text"],
      ["patient_name", "text"],
    ]);
  });
});

describe("toCrosswalkMeaningMatches", () => {
  it("orients each pair onto a combined-dataset column, whichever way the reply names it", () => {
    const result = _request()!;

    expect(
      toCrosswalkMeaningMatches({
        request: result,
        matches: [
          { name: "birth_date", sameAs: "dob" },
          { name: "sex", sameAs: "GENDER" },
        ],
      }),
    ).toEqual([
      { columnId: DOB, sourceColumn: "birth_date" },
      { columnId: SEX, sourceColumn: "GENDER" },
    ]);
  });

  it("drops a pair within one side, and keeps each column in one pair", () => {
    const result = _request()!;

    expect(
      toCrosswalkMeaningMatches({
        request: result,
        matches: [
          { name: "sex", sameAs: "dob" },
          { name: "GENDER", sameAs: "birth_date" },
          { name: "dob", sameAs: "birth_date" },
          { name: "dob", sameAs: "patient_name" },
          { name: "sex", sameAs: "birth_date" },
        ],
      }),
    ).toEqual([{ columnId: DOB, sourceColumn: "birth_date" }]);
  });

  it("finds nothing when the reply names a filled column", () => {
    expect(
      toCrosswalkMeaningMatches({
        request: _request()!,
        matches: [{ name: "case_id", sameAs: "GENDER" }],
      }),
    ).toEqual([]);
  });
});
