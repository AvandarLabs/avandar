import { Model } from "@avandar/models";
import { describe, expect, it, vi } from "vitest";
import { applyChatTurnResponse } from "./applyChatTurnResponse";
import type { ChatResponse } from "$/models/chat/ChatResponse/ChatResponse";
import type { ApplyChatTurnResponseOptions } from "./applyChatTurnResponse";

const SQL_RESULTS_READY = "I ran the query. Your results are ready.";
const SQL_OUTCOME_COPY: ApplyChatTurnResponseOptions["sqlOutcomeCopy"] = {
  rows: SQL_RESULTS_READY,
  empty: "I ran the query, but it returned no rows.",
  failed: "I ran the query, but it failed.",
  unknown: "I applied the query in the Data Explorer.",
};

function _createHandlers(): ApplyChatTurnResponseOptions["handlers"] {
  return {
    queueDashboardBlock: vi.fn(),
    applyCreatedCaseTypes: vi.fn(),
    setPendingClarification: vi.fn(),
    setPendingCaseTypeDraft: vi.fn(),
    recordClarificationShown: vi.fn().mockResolvedValue("audit-id"),
  };
}

function _applyChatTurnResponse(
  options: Readonly<Omit<ApplyChatTurnResponseOptions, "sqlOutcomeCopy">>,
): ReturnType<typeof applyChatTurnResponse> {
  return applyChatTurnResponse({
    ...options,
    sqlOutcomeCopy: SQL_OUTCOME_COPY,
  });
}

describe("applyChatTurnResponse", () => {
  it("marks a discovery clarification as an internal continuation", async () => {
    const handlers = _createHandlers();
    const responseData: Omit<ChatResponse.T, "__type"> = {
      assistantText: "Which stored state represents California?",
      clarification: {
        question: "Which stored state represents California?",
        responseShape: {
          kind: "discovery",
          query: 'SELECT DISTINCT "state" FROM "mortality"',
          column: "state",
          multi: false,
          candidateValues: ["California", "CA"],
        },
        turnNumber: 1,
      },
    };
    const response = Model.make("ChatResponse", responseData);

    const result = await _applyChatTurnResponse({
      response,
      sqlOutcome: undefined,
      handlers,
    });

    expect(result.metadata?.custom).toEqual({
      isDiscoveryContinuation: true,
    });
  });

  it("keeps an ordinary clarification visible", async () => {
    const handlers = _createHandlers();
    const responseData: Omit<ChatResponse.T, "__type"> = {
      assistantText: "Which period?",
      clarification: {
        question: "Which period?",
        responseShape: {
          kind: "fixed_options",
          options: ["This month", "Last month"],
          multi: false,
        },
        turnNumber: 1,
      },
    };
    const response = Model.make("ChatResponse", responseData);

    const result = await _applyChatTurnResponse({
      response,
      sqlOutcome: undefined,
      handlers,
    });

    expect(result.metadata).toBeUndefined();
  });

  it("preserves dashboard, clarification, and generated SQL handling", async () => {
    const handlers = _createHandlers();
    const responseData: Omit<ChatResponse.T, "__type"> = {
      assistantText: "Here is the result.",
      generatedSql: {
        prompt: "Show totals",
        sql: "select 1",
      },
      dashboardBlock: {
        kind: "HeadingBlock",
        text: "Totals",
      },
      clarification: {
        question: "Which period?",
        responseShape: {
          kind: "fixed_options",
          options: ["This month", "Last month"],
          multi: false,
        },
        turnNumber: 1,
      },
    };
    const response = Model.make("ChatResponse", responseData);

    const result = await _applyChatTurnResponse({
      response,
      sqlOutcome: "rows",
      handlers,
    });

    expect(handlers.queueDashboardBlock).toHaveBeenCalledWith(
      response.dashboardBlock,
    );
    expect(handlers.recordClarificationShown).toHaveBeenCalledWith(
      response.clarification,
    );
    expect(handlers.setPendingClarification).toHaveBeenCalledWith({
      ...response.clarification,
      auditId: "audit-id",
    });
    expect(result.content).toEqual([
      { type: "text", text: "Here is the result." },
    ]);
  });

  it("does not append a SQL code block after applying generated SQL", async () => {
    const handlers = _createHandlers();
    const response = Model.make("ChatResponse", {
      assistantText: "Counted the rows.",
      generatedSql: {
        prompt: "how many rows",
        sql: "select count(*) from deaths",
      },
    });

    const result = await _applyChatTurnResponse({
      response,
      sqlOutcome: "rows",
      handlers,
    });

    expect(result.content).toEqual([
      { type: "text", text: "Counted the rows." },
    ]);
  });

  it("points at the results when the applied SQL returned rows and the assistant text is empty", async () => {
    const handlers = _createHandlers();
    const response = Model.make("ChatResponse", {
      assistantText: "",
      generatedSql: {
        prompt: "how many rows",
        sql: "select count(*) from deaths",
      },
    });

    const result = await _applyChatTurnResponse({
      response,
      sqlOutcome: "rows",
      handlers,
    });

    expect(result.content).toEqual([{ type: "text", text: SQL_RESULTS_READY }]);
  });

  it("replaces a SQL-announcement reply with the results pointer when the applied SQL returned rows", async () => {
    const handlers = _createHandlers();
    const response = Model.make("ChatResponse", {
      assistantText: "Here is the SQL I ran. Results are ready.",
      generatedSql: {
        prompt: "how many rows",
        sql: "select 1",
      },
    });

    const result = await _applyChatTurnResponse({
      response,
      sqlOutcome: "rows",
      handlers,
    });

    expect(result.content).toEqual([{ type: "text", text: SQL_RESULTS_READY }]);
  });

  it.each([
    ["returned no rows", "empty"],
    ["failed", "failed"],
    ["had no observed outcome", "unknown"],
  ] as const)(
    "does not point at results when the applied SQL %s",
    async (_label, sqlOutcome) => {
      const handlers = _createHandlers();
      const response = Model.make("ChatResponse", {
        assistantText: "",
        generatedSql: {
          prompt: "how many rows",
          sql: "select count(*) from deaths",
        },
      });

      const result = await _applyChatTurnResponse({
        response,
        sqlOutcome,
        handlers,
      });

      expect(result.content).toEqual([
        { type: "text", text: SQL_OUTCOME_COPY[sqlOutcome] },
      ]);
    },
  );

  it("persists chat-created case types", async () => {
    const handlers = _createHandlers();
    const createdCaseTypes = [
      {
        name: "COVID case",
        allowManualCreation: false,
        identities: [
          {
            datasetId: "0f2c9f3e-aaaa-4bbb-8ccc-ddddeeeeffff",
            primaryKeyColumnId: "1f2c9f3e-aaaa-4bbb-8ccc-ddddeeeeffff",
          },
        ],
        attributes: [{ name: "Notes", kind: "manual_entry" as const }],
      },
    ];
    const response = Model.make("ChatResponse", {
      assistantText: "Created COVID case.",
      createdCaseTypes,
    });

    await _applyChatTurnResponse({
      response,
      sqlOutcome: undefined,
      handlers,
    });

    expect(handlers.applyCreatedCaseTypes).toHaveBeenCalledWith(
      createdCaseTypes,
    );
  });

  it("hands a proposed case type to the draft card instead of persisting it", async () => {
    const handlers = _createHandlers();
    const proposedCaseType = {
      name: "COVID death record",
      allowManualCreation: false,
      sourceDatasets: [
        {
          datasetId: "0f2c9f3e-aaaa-4bbb-8ccc-ddddeeeeffff",
          primaryKeyColumnId: "1f2c9f3e-aaaa-4bbb-8ccc-ddddeeeeffff",
        },
      ],
      attributes: [],
      manualEntryAttributes: [],
    };
    const response = Model.make("ChatResponse", {
      assistantText: "Here is a draft.",
      proposedCaseType,
    });

    await _applyChatTurnResponse({
      response,
      sqlOutcome: undefined,
      handlers,
    });

    expect(handlers.setPendingCaseTypeDraft).toHaveBeenCalledWith(
      proposedCaseType,
    );
    expect(handlers.applyCreatedCaseTypes).not.toHaveBeenCalled();
  });

  it("leaves an existing draft alone on a turn that proposes nothing", async () => {
    const handlers = _createHandlers();
    const response = Model.make("ChatResponse", {
      assistantText: "Sure, what else would you like to change?",
    });

    await _applyChatTurnResponse({
      response,
      sqlOutcome: undefined,
      handlers,
    });

    expect(handlers.setPendingCaseTypeDraft).not.toHaveBeenCalled();
  });

  it("keeps prose and drops fenced SQL from the assistant text", async () => {
    const handlers = _createHandlers();
    const response = Model.make("ChatResponse", {
      assistantText:
        "Counted deaths by country.\n```sql\nselect 1\n```\nYou can inspect the table.",
      generatedSql: {
        prompt: "deaths by country",
        sql: "select 1",
      },
    });

    const result = await _applyChatTurnResponse({
      response,
      sqlOutcome: "rows",
      handlers,
    });

    expect(result.content).toEqual([
      {
        type: "text",
        text: "Counted deaths by country.\n\nYou can inspect the table.",
      },
    ]);
  });
});
