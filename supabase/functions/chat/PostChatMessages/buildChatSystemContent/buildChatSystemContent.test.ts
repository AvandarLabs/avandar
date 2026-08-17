/**
 * The system message decides what the model knows about the previous turn.
 * Attaching the prior SQL on every turn would be dishonest token spend, and
 * omitting it when the user is clearly refining makes the model rebuild from
 * scratch, so these pin exactly when each context block appears.
 */
import { buildChatSystemContent } from "@sbfn/chat/PostChatMessages/buildChatSystemContent/buildChatSystemContent.ts";
import { describe, expect, it } from "vitest";

const BASE = {
  isDataExplorer: true,
  isDashboards: false,
  sqlSystemPrompt: "SQL_PROMPT",
  lastSql: undefined,
  lastError: undefined,
  lastResultColumns: undefined,
  lastUserPrompt: "show me revenue by region",
  retryContextNote: "",
} as const;

describe("buildChatSystemContent", () => {
  it("includes the SQL prompt on the Data Explorer surface", () => {
    expect(buildChatSystemContent(BASE)).toContain("SQL_PROMPT");
  });

  it("attaches the prior SQL when the message reads as a refinement", () => {
    const content = buildChatSystemContent({
      ...BASE,
      lastSql: "SELECT 1",
      // "also" is a refinement hint, so the prior query should come along.
      lastUserPrompt: "also group by month",
    });

    expect(content).toContain("SELECT 1");
    expect(content).toContain("edit this prior query");
  });

  it("omits the prior SQL when the message reads as a new question", () => {
    const content = buildChatSystemContent({
      ...BASE,
      lastSql: "SELECT 1",
      lastUserPrompt: "how many customers signed up last quarter",
    });

    expect(content).not.toContain("SELECT 1");
  });

  it("omits the prior SQL on a refinement when there is no prior SQL", () => {
    const content = buildChatSystemContent({
      ...BASE,
      lastSql: undefined,
      lastUserPrompt: "also group by month",
    });

    expect(content).not.toContain("edit this prior query");
  });

  it("surfaces a prior runtime error so the model can fix the query", () => {
    const content = buildChatSystemContent({
      ...BASE,
      lastSql: "SELECT nope",
      lastError: 'Binder Error: Referenced column "nope" not found',
    });

    expect(content).toContain("Binder Error");
    expect(content).toContain("Use the error to fix the query");
  });

  it("describes the columns currently on the canvas", () => {
    const content = buildChatSystemContent({
      ...BASE,
      lastResultColumns: [
        { name: "region", dataType: "varchar" },
        { name: "total", dataType: "double" },
      ],
    });

    expect(content).toContain("- region (varchar)");
    expect(content).toContain("- total (double)");
    expect(content).toContain("live result schema");
  });

  it("omits the canvas columns when the result has none", () => {
    const content = buildChatSystemContent({
      ...BASE,
      lastResultColumns: [],
    });

    expect(content).not.toContain("live result schema");
  });

  it("carries no Data Explorer context onto the dashboards surface", () => {
    const content = buildChatSystemContent({
      ...BASE,
      isDataExplorer: false,
      isDashboards: true,
      lastSql: "SELECT 1",
      lastError: "boom",
      lastResultColumns: [{ name: "region", dataType: "varchar" }],
      lastUserPrompt: "also group by month",
    });

    expect(content).toContain("SQL_PROMPT");
    expect(content).not.toContain("SELECT 1");
    expect(content).not.toContain("boom");
    expect(content).not.toContain("live result schema");
  });

  it("appends the retry note to every surface", () => {
    const generic = buildChatSystemContent({
      ...BASE,
      isDataExplorer: false,
      isDashboards: false,
      retryContextNote: "\n\nRETRY_NOTE",
    });

    expect(generic.endsWith("\n\nRETRY_NOTE")).toBe(true);
  });
});
