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
      isDataExplorer: true,
      isDashboards: false,
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
      isDataExplorer: true,
      isDashboards: false,
      lastUserPrompt: "filter cholera",
      priorClarifications: 0,
      datasets: [{ id: CHOLERA_ID, name: "Cholera cases" }],
    });

    expect(parsed.clarification?.responseShape).toMatchObject({
      kind: "discovery",
      query: `SELECT DISTINCT "region" FROM "${CHOLERA_ID}" LIMIT 20`,
    });
  });
});
