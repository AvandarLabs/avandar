import { describe, expect, it } from "vitest";
import {
  buildDictionarySuggestionsMessages,
  DICTIONARY_SUGGESTIONS_MAX_MATCH_COLUMNS,
  DICTIONARY_SUGGESTIONS_MAX_MATCH_VALUES,
  DICTIONARY_SUGGESTIONS_MAX_OTHER_NAMES,
  DICTIONARY_SUGGESTIONS_MAX_REQUEST_LENGTH,
  DICTIONARY_SUGGESTIONS_MAX_VALUE_LENGTH,
  DICTIONARY_SUGGESTIONS_PROMPT_ID,
  DictionarySuggestionsRequestSchema,
  getDictionarySuggestionsMaxTokens,
  isDictionarySuggestionsPromptId,
  isDictionarySuggestionsRequestTooLarge,
  isIdentifyingColumnName,
  parseDictionaryLabelSuggestions,
  parseDictionaryMeaningMatches,
  stringifyDictionarySuggestionsRequest,
} from "$/agent/dictionarySuggestions/dictionarySuggestionsPrompt.ts";
import type {
  DictionarySuggestionColumn,
  DictionarySuggestionsRequest,
} from "$/agent/dictionarySuggestions/dictionarySuggestionsPrompt.ts";

const GENDER: DictionarySuggestionColumn = {
  name: "GENDER",
  otherNames: ["sex"],
  kind: "categorical",
  values: ["1", "2", "9"],
};

function _isLabelsRequestValid(
  column: Partial<DictionarySuggestionColumn>,
): boolean {
  return DictionarySuggestionsRequestSchema.safeParse({
    task: "labels",
    locale: "en",
    column: { ...GENDER, ...column },
  }).success;
}

function _makeCodes(count: number): string[] {
  return Array.from({ length: count }, (_item, index) => {
    return String(index + 1);
  });
}

describe("dictionarySuggestionsPrompt", () => {
  it("serves dictionary-suggestions-v1 and refuses any other id", () => {
    expect(
      isDictionarySuggestionsPromptId(DICTIONARY_SUGGESTIONS_PROMPT_ID),
    ).toBe(true);
    expect(isDictionarySuggestionsPromptId("chat-title-v1")).toBe(false);
  });

  it("asks for labels in the locale, with the column's names and codes", () => {
    const [system, user] = buildDictionarySuggestionsMessages({
      task: "labels",
      locale: "es",
      column: GENDER,
    });
    expect(system?.content).toContain("You label the coded values");
    expect(user?.content).toContain("Locale: es");
    expect(user?.content).toContain('"values":["1","2","9"]');
  });

  it("asks which columns record the same thing", () => {
    const [system] = buildDictionarySuggestionsMessages({
      task: "matches",
      locale: "en",
      columns: [GENDER, { ...GENDER, name: "sex_at_birth" }],
    });
    expect(system?.content).toContain("record the same thing");
  });

  it("reads labels from a reply wrapped in prose, keeping only the list's values", () => {
    const reply = `Here you go:
{"labels":[{"value":1,"label":" Male ","isMissing":false},{"value":"7","label":"Other","isMissing":false},{"value":"2","label":"","isMissing":false}],"description":"Sex recorded at intake."}`;
    expect(parseDictionaryLabelSuggestions(reply, ["1", "2", "9"])).toEqual({
      labels: [{ value: "1", label: "Male", isMissing: false }],
      description: "Sex recorded at intake.",
    });
  });

  it("returns nothing for a reply without JSON", () => {
    expect(
      parseDictionaryLabelSuggestions("I am not sure.", ["1"]),
    ).toBeUndefined();
    expect(
      parseDictionaryMeaningMatches("No matches.", ["a", "b"]),
    ).toBeUndefined();
  });

  it("keeps matches between two different entries it was asked about", () => {
    const reply = JSON.stringify({
      matches: [
        { name: "mmr_status", sameAs: "vax_status" },
        { name: "dob", sameAs: "vax_status" },
        { name: "vax_status", sameAs: "vax_status" },
      ],
    });
    expect(
      parseDictionaryMeaningMatches(reply, ["vax_status", "mmr_status"]),
    ).toEqual([{ name: "mmr_status", sameAs: "vax_status" }]);
  });

  it("writes the text a consent covers in one key order, whatever order it arrived in", () => {
    const shuffled: DictionarySuggestionsRequest = {
      locale: "en",
      column: {
        values: ["1"],
        kind: "categorical",
        otherNames: [],
        name: "GENDER",
      },
      task: "labels",
    };
    expect(stringifyDictionarySuggestionsRequest(shuffled)).toBe(
      '{"task":"labels","locale":"en","column":{"name":"GENDER","otherNames":[],"kind":"categorical","values":["1"]}}',
    );
  });

  it("refuses a matches request with fewer than two columns", () => {
    const parsed = DictionarySuggestionsRequestSchema.safeParse({
      task: "matches",
      locale: "en",
      columns: [GENDER],
    });
    expect(parsed.success).toBe(false);
  });

  it.each(["number", "date", "text", "identifier"] as const)(
    "refuses the values of a %s column",
    (kind) => {
      expect(_isLabelsRequestValid({ kind })).toBe(false);
      expect(_isLabelsRequestValid({ kind, values: [] })).toBe(true);
    },
  );

  it("refuses values in a matches request for a column that is not coded", () => {
    const parsed = DictionarySuggestionsRequestSchema.safeParse({
      task: "matches",
      locale: "en",
      columns: [GENDER, { ...GENDER, name: "notes", kind: "text" }],
    });
    expect(parsed.success).toBe(false);
  });

  it.each([
    [{ name: "first_name" }],
    [{ name: "PatientEmail" }],
    [{ otherNames: ["sex", "home_phone"] }],
  ])("refuses the values of a column named like %j", (column) => {
    expect(_isLabelsRequestValid(column)).toBe(false);
    expect(_isLabelsRequestValid({ ...column, values: [] })).toBe(true);
  });

  it("tells identifying column names from coded ones", () => {
    expect(isIdentifyingColumnName("mother_last_name")).toBe(true);
    expect(isIdentifyingColumnName("street_address")).toBe(true);
    expect(isIdentifyingColumnName("vax_status")).toBe(false);
  });

  it.each([
    "zip_code",
    "ZIPCode",
    "postal_code",
    "patient",
    "PatientID",
    "contact",
    "guardian",
    "parent_phone",
    "fname",
    "lname",
  ])("keeps the values of %s on the device", (columnName) => {
    expect(isIdentifyingColumnName(columnName)).toBe(true);
  });

  it("does not call an invalid request too large", () => {
    const parsed = DictionarySuggestionsRequestSchema.safeParse({
      task: "labels",
      locale: "en",
      column: { ...GENDER, kind: "text" },
    });
    expect(
      parsed.error && isDictionarySuggestionsRequestTooLarge(parsed.error),
    ).toBe(false);
  });

  it("caps the values of each column in a matches request, not in a labels request", () => {
    const tooMany = _makeCodes(DICTIONARY_SUGGESTIONS_MAX_MATCH_VALUES + 1);
    expect(_isLabelsRequestValid({ values: tooMany })).toBe(true);
    const parsed = DictionarySuggestionsRequestSchema.safeParse({
      task: "matches",
      locale: "en",
      columns: [GENDER, { ...GENDER, name: "sex", values: tooMany }],
    });
    expect(parsed.success).toBe(false);
  });

  it("refuses a request whose consent text is too long, however valid each column is", () => {
    const longNames = Array.from({ length: 50 }, (_item, index) => {
      return `a_long_other_column_label_number_${index}`;
    });
    const columns = Array.from({ length: 100 }, (_item, index) => {
      return { ...GENDER, name: `column_${index}`, otherNames: longNames };
    });
    const request = { task: "matches" as const, locale: "en", columns };
    expect(
      stringifyDictionarySuggestionsRequest(request).length,
    ).toBeGreaterThan(DICTIONARY_SUGGESTIONS_MAX_REQUEST_LENGTH);
    const parsed = DictionarySuggestionsRequestSchema.safeParse(request);
    expect(parsed.success).toBe(false);
    expect(
      parsed.error && isDictionarySuggestionsRequestTooLarge(parsed.error),
    ).toBe(true);
  });

  it("returns a label under the stored spelling of a code the reply wrote differently", () => {
    const reply = JSON.stringify({
      labels: [
        { value: "1", label: "Grade one", isMissing: false },
        { value: "02", label: "Grade two", isMissing: false },
      ],
      description: "",
    });
    expect(parseDictionaryLabelSuggestions(reply, ["01", "2"])?.labels).toEqual(
      [
        { value: "01", label: "Grade one", isMissing: false },
        { value: "2", label: "Grade two", isMissing: false },
      ],
    );
  });

  it("keeps the first label when a reply labels one code twice", () => {
    const reply = JSON.stringify({
      labels: [
        { value: "Y", label: "Yes", isMissing: false },
        { value: "y", label: "Yep", isMissing: false },
        { value: "Y", label: "Yes again", isMissing: false },
      ],
      description: "",
    });
    expect(parseDictionaryLabelSuggestions(reply, ["Y", "N"])?.labels).toEqual([
      { value: "Y", label: "Yes", isMissing: false },
    ]);
  });

  it("refuses a value one character over the schema's length limit", () => {
    const atLimit = "x".repeat(DICTIONARY_SUGGESTIONS_MAX_VALUE_LENGTH);
    expect(_isLabelsRequestValid({ values: [atLimit] })).toBe(true);
    expect(_isLabelsRequestValid({ values: [`${atLimit}x`] })).toBe(false);
  });

  it("refuses more other names and more match columns than the caps", () => {
    const manyNames = Array.from(
      { length: DICTIONARY_SUGGESTIONS_MAX_OTHER_NAMES + 1 },
      (_item, index) => {
        return `n${index}`;
      },
    );
    expect(_isLabelsRequestValid({ otherNames: manyNames })).toBe(false);
    const columns = Array.from(
      { length: DICTIONARY_SUGGESTIONS_MAX_MATCH_COLUMNS + 1 },
      (_item, index) => {
        return { ...GENDER, name: `c${index}`, otherNames: [], values: [] };
      },
    );
    expect(
      DictionarySuggestionsRequestSchema.safeParse({
        task: "matches",
        locale: "en",
        columns,
      }).success,
    ).toBe(false);
  });

  it("gives a labels reply for 50 values a token budget that fits it", () => {
    const column = { ...GENDER, values: _makeCodes(50) };
    const reply = JSON.stringify({
      labels: column.values.map((value) => {
        return {
          value,
          label: "A typical short label.",
          isMissing: false,
        };
      }),
      description: "d".repeat(300),
    });
    // A pessimistic estimate of three characters per token.
    const estimatedTokens = Math.ceil(reply.length / 3);
    const budget = getDictionarySuggestionsMaxTokens({
      task: "labels",
      locale: "en",
      column,
    });
    expect(budget).toBeGreaterThanOrEqual(estimatedTokens);
  });

  it("keeps the small budget for a matches reply", () => {
    expect(
      getDictionarySuggestionsMaxTokens({
        task: "matches",
        locale: "en",
        columns: [GENDER, { ...GENDER, name: "sex" }],
      }),
    ).toBe(800);
  });

  it("budgets a labels reply by each value's length, up to a cap", () => {
    const budgetFor = (values: string[]): number => {
      return getDictionarySuggestionsMaxTokens({
        task: "labels",
        locale: "en",
        column: { ...GENDER, values },
      });
    };
    // 300 base, then 25 plus one token per three characters of each value.
    expect(budgetFor(["1", "2"])).toBe(300 + 2 * (25 + 1));
    expect(budgetFor(["x".repeat(30)])).toBe(300 + 25 + 10);
    expect(budgetFor(_makeCodes(50))).toBe(300 + 50 * 26);
    const longCodes = Array.from({ length: 50 }, () => {
      return "x".repeat(200);
    });
    expect(budgetFor(longCodes)).toBe(3000);
  });
});
