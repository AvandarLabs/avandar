import { Model } from "@avandar/models";
import { describe, expect, it, vi } from "vitest";
import { applyChatTurnResponse } from "./applyChatTurnResponse";
import type { ApplyChatTurnResponseOptions } from "./applyChatTurnResponse";
import type { ChatResponse } from "$/models/chat/ChatResponse/ChatResponse";

const SQL_RESULTS_ON_CANVAS = "The results are on the canvas to the left.";

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
  options: Readonly<Omit<ApplyChatTurnResponseOptions, "sqlResultsOnCanvas">>,
): ReturnType<typeof applyChatTurnResponse> {
  return applyChatTurnResponse({
    ...options,
    sqlResultsOnCanvas: SQL_RESULTS_ON_CANVAS,
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
      sqlApplied: false,
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
      sqlApplied: false,
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
      sqlApplied: true,
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
      sqlApplied: true,
      handlers,
    });

    expect(result.content).toEqual([
      { type: "text", text: "Counted the rows." },
    ]);
  });

  it("points at the canvas when SQL was applied and the assistant text is empty", async () => {
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
      sqlApplied: true,
      handlers,
    });

    expect(result.content).toEqual([
      { type: "text", text: SQL_RESULTS_ON_CANVAS },
    ]);
  });

  it("replaces a SQL-announcement reply with the canvas pointer", async () => {
    const handlers = _createHandlers();
    const response = Model.make("ChatResponse", {
      assistantText:
        "Here is the SQL I ran. Results are on the canvas to the left.",
      generatedSql: {
        prompt: "how many rows",
        sql: "select 1",
      },
    });

    const result = await _applyChatTurnResponse({
      response,
      sqlApplied: true,
      handlers,
    });

    expect(result.content).toEqual([
      { type: "text", text: SQL_RESULTS_ON_CANVAS },
    ]);
  });

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
      sqlApplied: false,
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
      sqlApplied: false,
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
      sqlApplied: false,
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
      sqlApplied: true,
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
