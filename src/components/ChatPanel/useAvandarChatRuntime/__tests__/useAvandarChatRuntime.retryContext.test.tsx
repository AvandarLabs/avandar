/**
 * A turn tells the model it is a "Try again" only when the user actually asked
 * for one. Asking the same question again in a new chat is a fresh question.
 */
import { act, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DATASET_A_ID,
  makeSqlFromDatasetId,
  WORKSPACE_A_QUESTION,
} from "@/components/ChatPanel/useAvandarChatRuntime/__tests__/useAvandarChatRuntime.fixtures";
import {
  renderAppAt,
  resetHarness,
  respondWithSql,
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
    result: { id: "empty", columns: [], data: [], numRows: 0 },
    didAutoLimit: false,
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("useAvandarChatRuntime retry context", () => {
  it("sends no retry context when a new chat asks the same question again", async () => {
    await renderAppAt("/alpha/data-explorer");
    respondWithSql(makeSqlFromDatasetId(DATASET_A_ID));
    await sendChatMessage(WORKSPACE_A_QUESTION);

    act(() => {
      harness.startNewChat!();
    });
    apiPostMock.mockClear();
    respondWithSql(makeSqlFromDatasetId(DATASET_A_ID));
    await sendChatMessage(WORKSPACE_A_QUESTION);

    expect(apiPostMock.mock.calls[0]?.[0]?.body?.retryContext).toBeUndefined();
  });

  it("still sends the prior answer as retry context when the user clicks Try again", async () => {
    await renderAppAt("/alpha/data-explorer");
    respondWithSql(makeSqlFromDatasetId(DATASET_A_ID));
    await sendChatMessage(WORKSPACE_A_QUESTION);

    apiPostMock.mockClear();
    respondWithSql(makeSqlFromDatasetId(DATASET_A_ID));
    const messages = harness.runtime!.thread.getState().messages;
    await act(async () => {
      harness
        .runtime!.thread.getMessageById(messages.at(-1)!.id)
        .reload();
    });
    await waitFor(() => {
      expect(apiPostMock).toHaveBeenCalledOnce();
    });

    expect(apiPostMock.mock.calls[0]?.[0]?.body?.retryContext).toEqual({
      priorGeneratedSql: makeSqlFromDatasetId(DATASET_A_ID),
    });
  });
});
