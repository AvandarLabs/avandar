import { ChatPageContext } from "$/models/chat/ChatPageContext/ChatPageContext";
import { describe, expect, it } from "vitest";
import { ChatAnalyticsPayloads } from "@/components/ChatPanel/useAvandarChatRuntime/ChatAnalyticsPayloads/ChatAnalyticsPayloads";
import { CURRENT_SCHEMA_VERSION } from "@/views/DashboardApp/AvaPage/migrations/config";
import type { DashboardEditorAppState } from "@/views/DashboardApp/DashboardEditorStateManager/DashboardEditorStateManager";

const EDITOR_STATE_WITH_TWO_BLOCKS: DashboardEditorAppState = {
  activeDashboardId: "dashboard-1",
  editorData: {
    root: {
      props: {
        author: "",
        publishedAt: "",
        subtitle: "",
        title: "",
        horizontalPadding: "md",
        verticalPadding: "md",
        containerMaxWidth: { unit: "%", value: 100 },
        theme: "default",
        typography: "system",
        isAuthorHidden: false,
        isPublishedAtHidden: false,
        isSubtitleHidden: false,
        isTitleHidden: false,
        schemaVersion: CURRENT_SCHEMA_VERSION,
      },
    },
    content: [
      {
        type: "Card",
        props: { id: "block-1", content: [], title: "First" },
      },
      {
        type: "Card",
        props: { id: "block-2", content: [], title: "Second" },
      },
    ],
  },
  hasUnsavedChanges: false,
  editorRevision: 0,
  appendedBlockIds: [],
  pendingBlocks: [],
};

describe("ChatAnalyticsPayloads", () => {
  it("describes the initially selected local route", () => {
    expect(
      ChatAnalyticsPayloads.fromMessage({
        content: "show monthly sales",
        pageContext: ChatPageContext.createDataExplorerViewContext({
          openDatasetId: "dataset-1",
        }),
        selectedModelId: "offline:qwen-1.5b",
        runtimeMode: { kind: "local", localChatModelId: "qwen-1.5b" },
      }),
    ).toEqual({
      promptChars: 18,
      pageApp: "data-explorer",
      modelId: "offline:qwen-1.5b",
      runtimeMode: "local",
      hasOpenDataset: true,
    });
  });

  it("classifies an offered fallback as the attempted cloud route", () => {
    expect(
      ChatAnalyticsPayloads.fromMessage({
        content: "hello",
        pageContext: ChatPageContext.createOtherViewContext(),
        runtimeMode: { kind: "offer_local_fallback" },
      }),
    ).toEqual({
      promptChars: 5,
      pageApp: "other",
      runtimeMode: "cloud",
      hasOpenDataset: false,
    });
  });

  it("counts SQL without retaining SQL", () => {
    const payload = ChatAnalyticsPayloads.fromSql("select secret from data");
    expect(payload).toEqual({ sqlChars: 23 });
    expect(payload).not.toHaveProperty("sql");
  });

  it("counts a generated block without retaining prompt or SQL", () => {
    const payload = ChatAnalyticsPayloads.fromDashboardBlock({
      block: {
        kind: "DataViz",
        prompt: "show sales",
        sql: "select secret from sales",
        vizType: "bar",
      },
      pageContext: ChatPageContext.createDashboardsViewContext({
        dashboardId: "dashboard-1",
      }),
      editorState: EDITOR_STATE_WITH_TWO_BLOCKS,
    });

    expect(payload).toEqual({
      blockKind: "DataViz",
      vizType: "bar",
      dashboardId: "dashboard-1",
      blockCountAfter: 3,
    });
    expect(payload).not.toHaveProperty("sql");
    expect(payload).not.toHaveProperty("prompt");
  });

  it("omits block count when editor content is unavailable", () => {
    expect(
      ChatAnalyticsPayloads.fromDashboardBlock({
        block: { kind: "HeadingBlock", text: "Sales" },
        pageContext: ChatPageContext.createDashboardsViewContext({
          dashboardId: "dashboard-1",
        }),
        editorState: {
          ...EDITOR_STATE_WITH_TWO_BLOCKS,
          editorData: undefined,
        },
      }),
    ).toEqual({
      blockKind: "HeadingBlock",
      dashboardId: "dashboard-1",
    });
  });
});
