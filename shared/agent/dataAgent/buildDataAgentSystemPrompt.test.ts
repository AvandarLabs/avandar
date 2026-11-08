import { describe, expect, it } from "vitest";
import { buildDataAgentSystemPrompt } from "$/agent/dataAgent/buildDataAgentSystemPrompt.ts";

const DATASETS = [
  {
    id: "bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb",
    name: "cases.csv",
    columns: [
      { name: "state", dataType: "varchar" },
      { name: "date", dataType: "date" },
      { name: "cases", dataType: "bigint" },
    ],
  },
  {
    id: "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa",
    name: "deaths.csv",
    columns: [{ name: "deaths", dataType: "double" }],
  },
];

describe("buildDataAgentSystemPrompt", () => {
  it("lists datasets under the same aliases the app rewrites", () => {
    const prompt = buildDataAgentSystemPrompt({
      datasets: DATASETS,
      today: "2026-11-07",
    });

    // Aliases follow dataset id order, as in SqlTableAlias.
    expect(prompt).toContain('t0 = "deaths.csv": deaths number');
    expect(prompt).toContain(
      't1 = "cases.csv": state text, date date, cases int',
    );
  });

  it("ends with today's date so the rest of the prompt can be cached", () => {
    const first = buildDataAgentSystemPrompt({
      datasets: DATASETS,
      today: "2026-11-07",
    });
    const second = buildDataAgentSystemPrompt({
      datasets: DATASETS,
      today: "2026-11-08",
    });

    expect(first.endsWith("Today is 2026-11-07.")).toBe(true);
    expect(first.slice(0, -12)).toBe(second.slice(0, -12));
  });
});
