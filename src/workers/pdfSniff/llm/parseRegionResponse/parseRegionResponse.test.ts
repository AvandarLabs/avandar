import { describe, expect, it } from "vitest";

import { parseRegionResponse } from "./parseRegionResponse";

describe("parseRegionResponse", () => {
  it("parses a well-formed response into an extracted table", () => {
    const table = parseRegionResponse({
      regionId: "r1",
      pageIndex: 0,
      bbox: [0, 0, 100, 100],
      responseText: JSON.stringify([
        {
          subject: "West Darfur",
          metric: "deaths",
          value: 1,
          unit: "n",
          sourceText: "and one death in West Darfur.",
        },
      ]),
    });

    expect(table.extractedBy).toBe("model");
    expect(table.cells[1]).toEqual([
      "West Darfur",
      "deaths",
      "1",
      "n",
      "and one death in West Darfur.",
    ]);
  });

  it("tolerates a fenced code block around the JSON", () => {
    const table = parseRegionResponse({
      regionId: "r1",
      pageIndex: 0,
      bbox: [0, 0, 100, 100],
      responseText:
        '```json\n[{"subject":null,"metric":"cases","value":5,"unit":"n","sourceText":"x"}]\n```',
    });

    expect(table.cells).toHaveLength(2);
  });

  it("drops a row whose value is not a number", () => {
    // A hallucinated "several" must not become a row. Silently dropping it is
    // right: the rule-based rows are still there and the user sees the count.
    const table = parseRegionResponse({
      regionId: "r1",
      pageIndex: 0,
      bbox: [0, 0, 100, 100],
      responseText: JSON.stringify([
        {
          subject: null,
          metric: "cases",
          value: "several",
          unit: "n",
          sourceText: "x",
        },
        {
          subject: null,
          metric: "deaths",
          value: 3,
          unit: "n",
          sourceText: "y",
        },
      ]),
    });

    expect(table.cells).toHaveLength(2);
    expect(table.cells[1]![1]).toBe("deaths");
  });

  it("drops a row with an unknown unit", () => {
    const table = parseRegionResponse({
      regionId: "r1",
      pageIndex: 0,
      bbox: [0, 0, 100, 100],
      responseText: JSON.stringify([
        {
          subject: null,
          metric: "x",
          value: 1,
          unit: "bananas",
          sourceText: "z",
        },
      ]),
    });

    expect(table.cells).toEqual([]);
  });

  it("returns an empty table for unparseable output", () => {
    const table = parseRegionResponse({
      regionId: "r1",
      pageIndex: 0,
      bbox: [0, 0, 100, 100],
      responseText: "I could not find any measurements.",
    });

    expect(table.cells).toEqual([]);
    expect(table.flags).toHaveLength(1);
  });
});
