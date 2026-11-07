/**
 * Parsed SQL must use dataset ids or concept table names by the time it
 * leaves the edge function, even when the model wrote short aliases.
 */
import { parseOpenRouterResponse } from "@sbfn/chat/PostChatMessages/parsing/parseOpenRouterResponse.ts";
import { describe, expect, it } from "vitest";

const CHOLERA_ID = "0f2c9f3e-aaaa-4bbb-8ccc-ddddeeeeffff";
const CONCEPT_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

describe("parseOpenRouterResponse", () => {
  it("rewrites generateSql aliases to dataset ids", () => {
    const parsed = parseOpenRouterResponse({
      message: {
        tool_calls: [
          {
            function: {
              name: "generateSql",
              arguments: JSON.stringify({
                sql: 'SELECT "case_id" FROM "t0" LIMIT 10',
              }),
            },
          },
        ],
      },
      attemptText: "",
      lastUserPrompt: "preview cholera",
      priorClarifications: 0,
      datasets: [{ id: CHOLERA_ID, name: "Cholera cases" }],
    });

    expect(parsed.generatedSql?.sql).toContain(`FROM "${CHOLERA_ID}"`);
    expect(parsed.generatedSql?.sql).not.toContain('"t0"');
  });

  it("keeps SQL written as plain text out of the reply the user reads", () => {
    const parsed = parseOpenRouterResponse({
      message: {
        content:
          'SELECT "Province_State", SUM("daily_new_deaths") FROM "t0" GROUP BY 1',
      },
      attemptText:
        'SELECT "Province_State", SUM("daily_new_deaths") FROM "t0" GROUP BY 1',
      lastUserPrompt: "deaths by state",
      priorClarifications: 0,
      datasets: [{ id: CHOLERA_ID, name: "Cholera cases" }],
    });

    expect(parsed.generatedSql?.sql).toContain(`FROM "${CHOLERA_ID}"`);
    expect(parsed.text).toBe("");
  });

  it("keeps the prose around a fenced SQL block and drops the block", () => {
    const attemptText =
      'Here are monthly deaths for both states.\n```sql\nSELECT 1 FROM "t0"\n```\nI grouped by month.';
    const parsed = parseOpenRouterResponse({
      message: { content: attemptText },
      attemptText,
      lastUserPrompt: "compare states",
      priorClarifications: 0,
      datasets: [{ id: CHOLERA_ID, name: "Cholera cases" }],
    });

    expect(parsed.generatedSql?.sql).toContain(`FROM "${CHOLERA_ID}"`);
    expect(parsed.text).toBe(
      "Here are monthly deaths for both states.\n\nI grouped by month.",
    );
  });

  it("rewrites DataViz dashboard block aliases to dataset ids", () => {
    const parsed = parseOpenRouterResponse({
      message: {
        tool_calls: [
          {
            function: {
              name: "addDashboardBlock",
              arguments: JSON.stringify({
                kind: "DataViz",
                prompt: "Cases over time",
                sql: 'SELECT "date", COUNT(*) FROM "t0" GROUP BY 1',
                vizType: "line",
              }),
            },
          },
        ],
      },
      attemptText: "",
      lastUserPrompt: "chart cases",
      priorClarifications: 0,
      datasets: [{ id: CHOLERA_ID, name: "Cholera cases" }],
    });

    expect(parsed.dashboardBlock).toMatchObject({
      kind: "DataViz",
      sql: `SELECT "date", COUNT(*) FROM "${CHOLERA_ID}" GROUP BY 1`,
    });
  });

  it("uses generateSql's summary as the reply when the model wrote no text", () => {
    const parsed = parseOpenRouterResponse({
      message: {
        tool_calls: [
          {
            function: {
              name: "generateSql",
              arguments: JSON.stringify({
                sql: 'SELECT 1 FROM "t0"',
                summary:
                  "Monthly US deaths in 2022, from the US deaths dataset.",
              }),
            },
          },
        ],
      },
      attemptText: "",
      lastUserPrompt: "monthly deaths 2022",
      priorClarifications: 0,
      datasets: [{ id: CHOLERA_ID, name: "Cholera cases" }],
    });

    expect(parsed.text).toBe(
      "Monthly US deaths in 2022, from the US deaths dataset.",
    );
  });

  it("rewrites discovery query aliases to dataset ids", () => {
    const parsed = parseOpenRouterResponse({
      message: {
        tool_calls: [
          {
            function: {
              name: "clarify",
              arguments: JSON.stringify({
                question: "Which region?",
                responseShape: {
                  kind: "discovery",
                  query: 'SELECT DISTINCT "region" FROM "t0" LIMIT 20',
                  column: "region",
                  multi: false,
                  candidateValues: ["north"],
                },
              }),
            },
          },
        ],
      },
      attemptText: "",
      lastUserPrompt: "filter cholera",
      priorClarifications: 0,
      datasets: [{ id: CHOLERA_ID, name: "Cholera cases" }],
    });

    expect(parsed.clarification?.responseShape).toMatchObject({
      kind: "discovery",
      query: `SELECT DISTINCT "region" FROM "${CHOLERA_ID}" LIMIT 20`,
    });
  });

  it("rewrites generateSql concept aliases to concept table names", () => {
    const parsed = parseOpenRouterResponse({
      message: {
        tool_calls: [
          {
            function: {
              name: "generateSql",
              arguments: JSON.stringify({
                sql: 'SELECT "status" FROM "c0" LIMIT 10',
              }),
            },
          },
        ],
      },
      attemptText: "",
      lastUserPrompt: "preview cases",
      priorClarifications: 0,
      concepts: [{ id: CONCEPT_ID, name: "Case" }],
    });

    expect(parsed.generatedSql?.sql).toContain(`FROM "concept_${CONCEPT_ID}"`);
    expect(parsed.generatedSql?.sql).not.toContain('"c0"');
  });

  it("parses createCaseTypes without treating them as SQL", () => {
    const parsed = parseOpenRouterResponse({
      message: {
        tool_calls: [
          {
            function: {
              name: "createCaseTypes",
              arguments: JSON.stringify({
                cases: [
                  {
                    name: "COVID case",
                    identities: [
                      {
                        datasetId: CHOLERA_ID,
                        primaryKeyColumnId: CHOLERA_ID,
                      },
                    ],
                    attributes: [{ name: "Notes", kind: "manual_entry" }],
                  },
                ],
              }),
            },
          },
        ],
      },
      attemptText: "Creating COVID case",
      lastUserPrompt: "create it",
      priorClarifications: 0,
      skipSqlExtraction: true,
    });

    expect(parsed.createdCaseTypes?.[0]?.name).toBe("COVID case");
    expect(parsed.generatedSql).toBeUndefined();
  });
});
