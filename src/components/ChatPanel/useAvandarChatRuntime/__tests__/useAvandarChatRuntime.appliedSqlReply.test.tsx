/**
 * The assistant must not report "results are ready" for SQL whose query
 * failed or came back empty, and still does when the query returns rows.
 *
 * The app is mounted through the real `/$workspaceSlug` route component and
 * `WorkspaceLayout` provider tree; see `useAvandarChatRuntime.mocks.tsx` for
 * what is faked.
 */
import { waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WorkspaceRelationsDenied } from "@/clients/qetl/assertWorkspaceRelations/WorkspaceRelationsDenied";
import {
  DATASET_A_ID,
  DATASET_B_ID,
  makeSqlFromDatasetId,
  RESULTS_READY,
  WORKSPACE_A,
  WORKSPACE_A_QUESTION,
} from "@/components/ChatPanel/useAvandarChatRuntime/__tests__/useAvandarChatRuntime.fixtures";
import {
  getLastAssistantText,
  renderAppAt,
  resetHarness,
  respondWithSql,
  sendChatMessage,
} from "@/components/ChatPanel/useAvandarChatRuntime/__tests__/useAvandarChatRuntime.harness";
import {
  harness,
  runQueryMock,
} from "@/components/ChatPanel/useAvandarChatRuntime/__tests__/useAvandarChatRuntime.mocks";

beforeEach(() => {
  resetHarness();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("useAvandarChatRuntime reply to SQL it applied", () => {
  it("does not say the results are ready when the query is refused", async () => {
    runQueryMock.mockRejectedValue(
      new WorkspaceRelationsDenied({
        workspaceId: WORKSPACE_A.id,
        deniedDatasetIds: [DATASET_B_ID],
      }),
    );
    await renderAppAt("/alpha/data-explorer");
    respondWithSql(makeSqlFromDatasetId(DATASET_B_ID));

    await sendChatMessage(WORKSPACE_A_QUESTION);
    await waitFor(() => {
      expect(harness.explorerState?.lastQueryError).toContain(
        "do not belong to it",
      );
    });

    expect(getLastAssistantText()).not.toBe(RESULTS_READY);
  });

  it("does not say the results are ready when the query returns no rows", async () => {
    runQueryMock.mockResolvedValue({
      result: { id: "empty", columns: [], data: [], numRows: 0 },
      didAutoLimit: false,
    });
    await renderAppAt("/alpha/data-explorer");
    respondWithSql(makeSqlFromDatasetId(DATASET_A_ID));

    await sendChatMessage(WORKSPACE_A_QUESTION);
    await waitFor(() => {
      expect(harness.queryStatus).toBe("success");
    });

    expect(getLastAssistantText()).not.toBe(RESULTS_READY);
  });

  it("says the results are ready when the query returns rows", async () => {
    // Positive control: the copy above is withheld for a reason, not gone.
    runQueryMock.mockResolvedValue({
      result: {
        id: "rows",
        columns: [{ name: "region", dataType: "text" }],
        data: [{ region: "norte" }],
        numRows: 1,
      },
      didAutoLimit: false,
    });
    await renderAppAt("/alpha/data-explorer");
    respondWithSql(makeSqlFromDatasetId(DATASET_A_ID));

    await sendChatMessage(WORKSPACE_A_QUESTION);
    await waitFor(() => {
      expect(harness.queryStatus).toBe("success");
    });

    expect(getLastAssistantText()).toBe(RESULTS_READY);
  });
});
