import { describe, expect, it } from "vitest";
import { ColumnCodes } from "$/models/dataDictionaries/ColumnCodes/ColumnCodes.ts";

const SEX_PAIRS: ColumnCodes.Pair[] = [
  { code: "1", label: "Male", acceptedSpellings: ["M"], isMissing: false },
  { code: "2", label: "Female", acceptedSpellings: ["F"], isMissing: false },
  { code: "9", label: "Unknown", acceptedSpellings: [], isMissing: true },
];

const ROWS: ColumnCodes.Rows = {
  bindings: [
    {
      datasetColumnId: "col-gender",
      dictionaryId: "dict-1",
      entryId: "entry-sex",
      codeListId: "list-sex",
      mode: "reference",
      direction: "decode",
    },
    {
      datasetColumnId: "col-case",
      dictionaryId: "dict-1",
      entryId: "entry-case",
      codeListId: undefined,
      mode: "reference",
      direction: "decode",
    },
    {
      datasetColumnId: "col-orphan",
      dictionaryId: undefined,
      entryId: undefined,
      codeListId: undefined,
      mode: "reference",
      direction: "decode",
    },
  ],
  dictionaries: [{ id: "dict-1", name: "NYS measles case report" }],
  entries: [
    { id: "entry-sex", name: "sex", description: "Sex on the report." },
    { id: "entry-case", name: "case_id", description: undefined },
  ],
  codeLists: [
    { id: "list-sex", name: "Sex (1/2/9)", isOrdered: false, pairs: SEX_PAIRS },
  ],
};

describe("ColumnCodes.fromRows", () => {
  it("joins a binding to its dictionary, entry, and code list", () => {
    const codes = ColumnCodes.fromRows(ROWS).get("col-gender");

    expect(codes).toMatchObject({
      dictionaryName: "NYS measles case report",
      entryName: "sex",
      codeListName: "Sex (1/2/9)",
      description: "Sex on the report.",
      pairs: SEX_PAIRS,
    });
  });

  it("keeps a description-only binding with no pairs", () => {
    const codes = ColumnCodes.fromRows(ROWS).get("col-case");

    expect(codes?.pairs).toEqual([]);
    expect(codes?.codeListName).toBeUndefined();
  });

  it("leaves out a binding whose entry is gone", () => {
    expect(ColumnCodes.fromRows(ROWS).has("col-orphan")).toBe(false);
  });
});

describe("ColumnCodes.fromStoredPairs", () => {
  it("reads stored snake_case pairs", () => {
    expect(
      ColumnCodes.fromStoredPairs([
        {
          code: "1",
          label: "Male",
          accepted_spellings: ["M"],
          is_missing: false,
        },
      ]),
    ).toEqual([
      { code: "1", label: "Male", acceptedSpellings: ["M"], isMissing: false },
    ]);
  });

  it("skips a pair without a code", () => {
    expect(ColumnCodes.fromStoredPairs([{ label: "Male" }, "junk"])).toEqual(
      [],
    );
  });
});

describe("ColumnCodes.formatPairs", () => {
  it("writes codes with their labels and marks missing values", () => {
    expect(
      ColumnCodes.formatPairs({ direction: "decode", pairs: SEX_PAIRS }),
    ).toBe("1=Male, 2=Female, 9=Unknown (missing)");
  });

  it("says when a code has no label yet", () => {
    expect(
      ColumnCodes.formatPairs({
        direction: "decode",
        pairs: [{ ...SEX_PAIRS[0]!, label: "  " }],
      }),
    ).toBe("1=(no label)");
  });

  it("lists only the labels for a column that holds labels", () => {
    expect(
      ColumnCodes.formatPairs({ direction: "encode", pairs: SEX_PAIRS }),
    ).toBe("Male, Female, Unknown (missing)");
  });

  it("stops after 30 pairs and says how many more there are", () => {
    const pairs = Array.from({ length: 42 }, (_, index) => {
      return {
        code: String(index),
        label: `Label ${index}`,
        acceptedSpellings: [],
        isMissing: false,
      };
    });

    const text = ColumnCodes.formatPairs({ direction: "decode", pairs });

    expect(text.endsWith("29=Label 29, and 12 more")).toBe(true);
  });
});

describe("ColumnCodes.formatDescription", () => {
  it("cuts a long description to 120 characters", () => {
    const text = ColumnCodes.formatDescription("word ".repeat(40));

    expect(text?.length).toBeLessThanOrEqual(120);
    expect(text?.endsWith("...")).toBe(true);
  });

  it("gives nothing for a blank description", () => {
    expect(ColumnCodes.formatDescription("   ")).toBeUndefined();
  });
});

describe("ColumnCodes.findPairByLabel", () => {
  it("finds a pair by its label, ignoring case", () => {
    expect(
      ColumnCodes.findPairByLabel(
        { direction: "decode", pairs: SEX_PAIRS },
        "female",
      )?.code,
    ).toBe("2");
  });

  it("finds a pair by an accepted spelling", () => {
    expect(
      ColumnCodes.findPairByLabel(
        { direction: "decode", pairs: SEX_PAIRS },
        "m",
      )?.code,
    ).toBe("1");
  });

  it("never matches a blank label", () => {
    expect(
      ColumnCodes.findPairByLabel(
        {
          direction: "decode",
          pairs: [{ ...SEX_PAIRS[0]!, label: "", acceptedSpellings: [] }],
        },
        "",
      ),
    ).toBeUndefined();
  });
});
