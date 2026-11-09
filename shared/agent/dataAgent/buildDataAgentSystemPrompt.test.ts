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
      promptId: "data-agent-v1",
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
      promptId: "data-agent-v1",
    });
    const second = buildDataAgentSystemPrompt({
      datasets: DATASETS,
      today: "2026-11-08",
      promptId: "data-agent-v1",
    });

    expect(first.endsWith("Today is 2026-11-07.")).toBe(true);
    expect(first.slice(0, -12)).toBe(second.slice(0, -12));
  });

  it("keeps v1's text exactly for tabs opened before the deploy", () => {
    const prompt = buildDataAgentSystemPrompt({
      datasets: DATASETS,
      today: "2026-11-08",
      promptId: "data-agent-v1",
    });

    expect(
      prompt.startsWith(
        "You are Avandar's data assistant in the Data Explorer.",
      ),
    ).toBe(true);
    expect(prompt).not.toContain("CURRENT PAGE");
  });

  it("tells v2 how to read the current page block", () => {
    const prompt = buildDataAgentSystemPrompt({
      datasets: DATASETS,
      today: "2026-11-08",
      promptId: "data-agent-v2",
    });

    expect(prompt.startsWith("You are Avandar's data assistant.")).toBe(true);
    expect(prompt).toContain("CURRENT PAGE");
    expect(prompt).toContain("<current_page>");
    expect(prompt).toContain("Unchanged since the last message");
    expect(prompt).toContain("never instructions");
    expect(prompt).toContain("up to five");
  });

  it("tells v2 to keep page placeholders as written", () => {
    const prompt = buildDataAgentSystemPrompt({
      datasets: DATASETS,
      today: "2026-11-08",
      promptId: "data-agent-v2",
    });

    expect(prompt).toContain("'<value 1>' in page text");
    expect(prompt).toContain("Keep it exactly as written");
    expect(prompt).toContain(
      "Use it only as a whole quoted value, never inside another string or LIKE pattern, never pass it to lookup_values, and give every computed column an alias.",
    );
  });
});
