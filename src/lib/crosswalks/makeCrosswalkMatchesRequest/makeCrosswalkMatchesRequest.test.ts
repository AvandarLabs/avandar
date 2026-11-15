import { beforeEach, describe, expect, it, vi } from "vitest";
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
import type { CrosswalkColumn } from "$/models/crosswalks/CrosswalkColumn/CrosswalkColumn";
import type { CrosswalkMapping } from "$/models/crosswalks/CrosswalkMapping/CrosswalkMapping";
import type { CrosswalkDraft } from "@/lib/crosswalks/CrosswalkDraft/CrosswalkDraft";

const modelState = vi.hoisted(() => {
  return { windowSize: 8192 };
});

// The offline model's context window, which a test can shrink to make a
// request too large for it.
vi.mock(
  "@/stores/OfflineChatEngineStore/createLocalModelRuntime/offlineChatContextWindow",
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import("@/stores/OfflineChatEngineStore/createLocalModelRuntime/offlineChatContextWindow")
      >();
    return {
      ...actual,
      get OFFLINE_CHAT_CONTEXT_WINDOW_SIZE() {
        return modelState.windowSize;
      },
    };
  },
);

function _result(
  draft: CrosswalkDraft.T = makeMeaningDraft(),
  model: "online" | "on_device" = "online",
) {
  return makeCrosswalkMatchesRequest({
    draft,
    layoutId: QUEENS_LAYOUT,
    datasetsById: MEANING_CONTEXT.datasetsById,
    targets: MEANING_TARGETS,
    profilesBySourceColumn: MEANING_SOURCES_BY_NAME,
    locale: "en",
    model,
  });
}

function _request(draft?: CrosswalkDraft.T) {
  const result = _result(draft);
  return result.status === "ready" ? result.request : undefined;
}

/** The meaning draft with more combined-dataset columns no fill reaches. */
function _withExtraColumns(count: number): CrosswalkDraft.T {
  const draft = makeMeaningDraft();
  const extraColumns = Array.from({ length: count }, (_item, index) => {
    return {
      id: `c1000000-0000-4000-8000-${String(index).padStart(12, "0")}` as CrosswalkColumn.Id,
      name: `extra_${index}`,
      position: draft.columns.length + index,
      dataType: "varchar" as const,
      entryId: undefined,
    };
  });
  return { ...draft, columns: [...draft.columns, ...extraColumns] };
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
      {
        name: "GENDER",
        otherNames: [],
        kind: "categorical",
        values: ["1", "2"],
      },
      { name: "dob", otherNames: [], kind: "date", values: [] },
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

    expect(_names(renamed)).toEqual(["sex", "birth_date", "dob"]);
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

    expect(_result(draft)).toEqual({ status: "nothing_to_match" });
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
    ).toEqual({ status: "nothing_to_match" });
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
      result.status === "ready"
        ? result.request.request.columns.map((column) => {
            return [column.name, column.kind];
          })
        : undefined,
    ).toEqual([
      ["sex", "text"],
      ["GENDER", "number"],
      ["dob", "date"],
      ["birth_date", "text"],
      ["patient_name", "text"],
    ]);
  });
});

describe("makeCrosswalkMatchesRequest on a wide crosswalk", () => {
  beforeEach(() => {
    modelState.windowSize = 8192;
  });

  it("keeps the layout's columns in a request cut to the column limit", () => {
    const request = _request(_withExtraColumns(350));

    expect(request?.request.columns).toHaveLength(300);
    expect(request?.sourceNames).toEqual(
      new Set(["GENDER", "birth_date", "patient_name"]),
    );
  });

  it("alternates the combined dataset's columns with the layout's", () => {
    const names = _request(_withExtraColumns(4))?.request.columns.map(
      (column) => {
        return column.name;
      },
    );

    expect(names?.slice(0, 4)).toEqual(["sex", "GENDER", "dob", "birth_date"]);
  });

  it("says a request is too large when the model cannot take even one pair", () => {
    modelState.windowSize = 10;

    expect(_result(makeMeaningDraft(), "on_device")).toEqual({
      status: "too_large_for_model",
    });
  });

  it("takes the same request on a model with room", () => {
    expect(_result(makeMeaningDraft(), "on_device").status).toBe("ready");
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

  it("drops a pair within one side", () => {
    expect(
      toCrosswalkMeaningMatches({
        request: _request()!,
        matches: [
          { name: "sex", sameAs: "dob" },
          { name: "GENDER", sameAs: "birth_date" },
        ],
      }),
    ).toEqual([]);
  });

  it("keeps each column in one pair, first pair first", () => {
    const result = _request()!;

    expect(
      toCrosswalkMeaningMatches({
        request: result,
        matches: [
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
