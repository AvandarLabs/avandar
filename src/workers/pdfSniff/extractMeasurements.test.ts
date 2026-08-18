import { describe, expect, it } from "vitest";
import { extractMeasurements } from "./extractMeasurements";

describe("extractMeasurements", () => {
  it("reads several measurements from one sentence", () => {
    // From the IMC situation report, page 1.
    const found = extractMeasurements(
      "In June, 21,563 cases and 388 deaths have been reported.",
    );

    expect(found).toEqual([
      expect.objectContaining({ metric: "cases", value: 21563 }),
      expect.objectContaining({ metric: "deaths", value: 388 }),
    ]);
  });

  it("attaches a trailing subject clause to the measurements it governs", () => {
    // "166 cases and 13 deaths in South Darfur": the subject arrives at the
    // end and applies to both figures before it.
    const found = extractMeasurements(
      "There were 166 cases and 13 deaths in South Darfur.",
    );

    expect(found).toHaveLength(2);
    expect(
      found.every((m) => {
        return m.subject === "South Darfur";
      }),
    ).toBe(true);
  });

  it("reads a number written as a word", () => {
    // "one death in West Darfur" is the case that defeats a digits-only
    // regex, and it appears in the gate document.
    const found = extractMeasurements("and one death in West Darfur.");

    expect(found[0]).toMatchObject({
      metric: "death",
      value: 1,
      subject: "West Darfur",
    });
  });

  it("expands a scale word into the full number", () => {
    const found = extractMeasurements(
      "More than 33.5 million people are at risk.",
    );

    expect(found[0]).toMatchObject({ value: 33_500_000, metric: "people" });
  });

  it("reads a currency amount with a scale word", () => {
    const found = extractMeasurements(
      "Urgent funding of $50 million is needed.",
    );

    expect(found[0]).toMatchObject({ value: 50_000_000, unit: "usd" });
  });

  it("reads a percentage written either way", () => {
    expect(extractMeasurements("funded at 16 per cent")[0]).toMatchObject({
      value: 16,
      unit: "percent",
    });
    expect(
      extractMeasurements("a case fatality rate of 2.6%")[0],
    ).toMatchObject({ value: 2.6, unit: "percent" });
  });

  it("keeps a multi-word metric", () => {
    const found = extractMeasurements(
      "EWARS has been expanded to 573 health facilities in Darfur.",
    );

    expect(found[0]).toMatchObject({
      value: 573,
      metric: "health facilities",
      subject: "Darfur",
    });
  });

  it("records the sentence each measurement came from", () => {
    const sentence = "In June, 21,563 cases were reported.";
    const found = extractMeasurements(sentence);

    expect(found[0]!.sourceText).toBe(sentence);
  });

  it("ignores a year, which is a date and not a measurement", () => {
    // "Since July 2024" and "in 2025 alone" would otherwise produce
    // measurements of 2024 and 2025 with nonsense metrics.
    expect(extractMeasurements("Since July 2024, cases have risen.")).toEqual(
      [],
    );
    expect(extractMeasurements("In 2025 alone, cases rose.")).toEqual([]);
  });

  it("ignores a bare number with no following noun", () => {
    expect(extractMeasurements("Only 12 of them.")).toEqual([]);
  });

  it("returns nothing for a sentence with no numbers", () => {
    expect(
      extractMeasurements("The outbreak remains widespread and severe."),
    ).toEqual([]);
  });
});
