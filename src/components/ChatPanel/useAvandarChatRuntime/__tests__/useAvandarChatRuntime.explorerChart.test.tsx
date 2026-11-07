/**
 * A chart request in the Data Explorer can come back as a dashboard chart
 * block. With no dashboard open, the explorer runs the chart's SQL and shows
 * it as that chart type, rather than claiming a dashboard got a block.
 */
import { Model } from "@avandar/models";
import { waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DATASET_A_ID,
  makeSqlFromDatasetId,
  WORKSPACE_A_QUESTION,
} from "@/components/ChatPanel/useAvandarChatRuntime/__tests__/useAvandarChatRuntime.fixtures";
import {
  getLastAssistantText,
  renderAppAt,
  resetHarness,
  sendChatMessage,
} from "@/components/ChatPanel/useAvandarChatRuntime/__tests__/useAvandarChatRuntime.harness";
import {
  apiPostMock,
  harness,
  runQueryMock,
} from "@/components/ChatPanel/useAvandarChatRuntime/__tests__/useAvandarChatRuntime.mocks";

beforeEach(() => {
  resetHarness();
  runQueryMock.mockResolvedValue({
    result: { id: "rows", columns: [], data: [{ n: 1 }], numRows: 1 },
    didAutoLimit: false,
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("useAvandarChatRuntime chart blocks in the Data Explorer", () => {
  it("runs a chart block's SQL in the explorer as that chart type", async () => {
    await renderAppAt("/alpha/data-explorer");
    apiPostMock.mockResolvedValueOnce(
      Model.make("ChatResponse", {
        assistantText: 'Added "Cases over time" to your dashboard as a line.',
        dashboardBlock: {
          kind: "DataViz",
          prompt: "Cases over time",
          sql: makeSqlFromDatasetId(DATASET_A_ID),
          vizType: "line",
        },
      }),
    );

    await sendChatMessage(WORKSPACE_A_QUESTION);

    await waitFor(() => {
      expect(harness.explorerState?.rawSql).toBe(
        makeSqlFromDatasetId(DATASET_A_ID),
      );
    });
    expect(harness.explorerState?.vizConfig.vizType).toBe("line");
    expect(getLastAssistantText()).not.toMatch(/dashboard/i);
  });

  it("says a heading block needs a dashboard instead of claiming it was added", async () => {
    await renderAppAt("/alpha/data-explorer");
    apiPostMock.mockResolvedValueOnce(
      Model.make("ChatResponse", {
        assistantText: "Added a heading to your dashboard.",
        dashboardBlock: { kind: "HeadingBlock", text: "COVID in the US" },
      }),
    );

    await sendChatMessage(WORKSPACE_A_QUESTION);

    expect(getLastAssistantText()).toBe(
      "I can only add that to a dashboard. Open a dashboard and ask me again there.",
    );
  });
});
