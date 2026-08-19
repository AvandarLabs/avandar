/**
 * Parsed SQL must use dataset ids by the time it leaves the edge function,
 * even when the model wrote short aliases.
 */
import { parseOpenRouterResponse } from "@sbfn/chat/PostChatMessages/parsing/parseOpenRouterResponse.ts";
import { describe, expect, it } from "vitest";

const CHOLERA_ID = "0f2c9f3e-aaaa-4bbb-8ccc-ddddeeeeffff";

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
    const conceptId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
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
      concepts: [{ id: conceptId, name: "Case" }],
    });

    expect(parsed.generatedSql?.sql).toContain(`FROM "concept_${conceptId}"`);
    expect(parsed.generatedSql?.sql).not.toContain('"c0"');
  });
});
