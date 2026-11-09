import { Model } from "@avandar/models";
import { describe, expect, it, vi } from "vitest";
import { applyChatModelTurnResponse } from "./applyChatModelTurnResponse";
import type { ChatRuntimeCopy } from "@/components/ChatPanel/useAvandarChatRuntime/chatRuntimeTurnHelpers";

vi.mock("@/lib/analytics/AnalyticsClient", () => {
  return { AnalyticsClient: { logEvent: vi.fn() } };
});

vi.mock(
  "@/components/ChatPanel/useAvandarChatRuntime/waitForAppliedSqlOutcome/waitForAppliedSqlOutcome",
  () => {
    return { waitForAppliedSqlOutcome: vi.fn().mockResolvedValue("failed") };
  },
);

vi.mock(
  "@/components/ChatPanel/applyChatTurnResponse/applyChatTurnResponse",
  () => {
    return {
      applyChatTurnResponse: () => {
        return { content: [] };
      },
    };
  },
);

describe("applyChatModelTurnResponse", () => {
  it("labels the explorer's prompt with the question label", async () => {
    const setNlPrompt = vi.fn();

    await applyChatModelTurnResponse({
      response: Model.make("ChatResponse", {
        assistantText: "Here.",
        generatedSql: { sql: "SELECT 1" },
      }),
      apiMessages: [
        Model.make("ChatClientMessage", {
          role: "user",
          content: 'Show @"US deaths"',
        }),
      ],
      questionLabel: "Show @US deaths",
      currentUser: undefined,
      currentPageContext: Model.make("ChatPageContext", { app: "other" }),
      workspaceId: "workspace-1",
      isGenerationStale: () => {
        return false;
      },
      copyRef: { current: {} as ChatRuntimeCopy },
      parseSqlRef: { current: vi.fn() },
      dashboardEditorStateRef: { current: {} },
      dataExplorerDispatch: {
        setRawSql: vi.fn(),
        setNlPrompt,
        applySqlMapping: vi.fn(),
      },
      dashboardEditorDispatch: {},
      chatPanelDispatch: {},
    } as unknown as Parameters<typeof applyChatModelTurnResponse>[0]);

    expect(setNlPrompt).toHaveBeenCalledWith("Show @US deaths");
  });

  it("does not put a query on the explorer for a column comparison", async () => {
    const setRawSql = vi.fn();

    await applyChatModelTurnResponse({
      response: Model.make("ChatResponse", {
        assistantText:
          "They can be stacked only after renaming columns that differ.",
        generatedSql: { sql: "SELECT 1" },
      }),
      apiMessages: [
        Model.make("ChatClientMessage", {
          role: "user",
          content:
            "Are the two survey datasets appendable? Do they have similar columns?",
        }),
      ],
      currentUser: undefined,
      currentPageContext: Model.make("ChatPageContext", {
        app: "data-explorer",
      }),
      workspaceId: "workspace-1",
      isGenerationStale: () => {
        return false;
      },
      copyRef: { current: {} as ChatRuntimeCopy },
      parseSqlRef: { current: vi.fn() },
      dashboardEditorStateRef: { current: {} },
      dataExplorerDispatch: {
        setRawSql,
        setNlPrompt: vi.fn(),
        applySqlMapping: vi.fn(),
      },
      dashboardEditorDispatch: {},
      chatPanelDispatch: {},
    } as unknown as Parameters<typeof applyChatModelTurnResponse>[0]);

    expect(setRawSql).not.toHaveBeenCalled();
  });
});
