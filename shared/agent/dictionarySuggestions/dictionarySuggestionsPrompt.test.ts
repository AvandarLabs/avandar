import { describe, expect, it } from "vitest";
import {
  buildDictionarySuggestionsMessages,
  DICTIONARY_SUGGESTIONS_PROMPT_ID,
  DictionarySuggestionsRequestSchema,
  isDictionarySuggestionsPromptId,
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
});
