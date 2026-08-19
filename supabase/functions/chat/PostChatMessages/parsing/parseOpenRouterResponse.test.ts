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
