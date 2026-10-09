/**
 * Switching workspaces in-app, the way the navbar switcher does (client-side
 * navigation that only changes `$workspaceSlug`), must not carry workspace A's
 * explorer state or chat thread into workspace B.
 *
 * The app is mounted through the real `/$workspaceSlug` route component and
 * `WorkspaceLayout` provider tree; see `useAvandarChatRuntime.mocks.tsx` for
 * what is faked.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DATASET_A_ID,
  DATASET_B_ID,
  makeSqlFromDatasetId,
  WORKSPACE_A,
  WORKSPACE_A_QUESTION,
  WORKSPACE_B,
  WORKSPACE_B_QUESTION,
} from "@/components/ChatPanel/useAvandarChatRuntime/__tests__/useAvandarChatRuntime.fixtures";
import {
  getThreadTexts,
  makeThreadStorageKeyFromWorkspace,
  resetHarness,
  respondWithSql,
  seedWorkspaceASession,
  sendChatMessage,
  switchToWorkspaceB,
} from "@/components/ChatPanel/useAvandarChatRuntime/__tests__/useAvandarChatRuntime.harness";
import {
  apiPostMock,
  harness,
} from "@/components/ChatPanel/useAvandarChatRuntime/__tests__/useAvandarChatRuntime.mocks";

beforeEach(() => {
  resetHarness();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("useAvandarChatRuntime after an in-app workspace switch", () => {
  it("leaves no workspace A dataset in the explorer's SQL, open dataset or error", async () => {
    const router = await seedWorkspaceASession();
    // Precondition: the explorer really does hold workspace A's state.
    expect(harness.explorerState?.rawSql).toContain(DATASET_A_ID);

    await switchToWorkspaceB(router);

    expect({
      rawSql: harness.explorerState?.rawSql,
      openDatasetId: harness.explorerState?.openDataset?.datasetId,
      lastQueryError: harness.explorerState?.lastQueryError,
    }).toEqual({
      rawSql: undefined,
      openDatasetId: undefined,
      lastQueryError: undefined,
    });
  });

  it("does not show workspace A's messages in workspace B's chat thread", async () => {
    const router = await seedWorkspaceASession();
    expect(getThreadTexts()).toContain(WORKSPACE_A_QUESTION);

    await switchToWorkspaceB(router);

    expect(getThreadTexts()).not.toContain(WORKSPACE_A_QUESTION);
  });

  it("sends no workspace A dataset id in workspace B's first chat request", async () => {
    const router = await seedWorkspaceASession();
    await switchToWorkspaceB(router);
    apiPostMock.mockClear();
    respondWithSql(makeSqlFromDatasetId(DATASET_B_ID));

    await sendChatMessage(WORKSPACE_B_QUESTION);

    const request = apiPostMock.mock.calls[0]?.[0];
    expect(request?.pathParams).toEqual({ workspaceId: WORKSPACE_B.id });
    // Covers every channel a raw id reaches the model through: the "Previous
    // SQL" suffix (`context.lastSql`), `context.lastError`,
    // `context.openDatasetId`, and the hidden view-change lines in `messages`.
    expect(JSON.stringify(request?.body)).not.toContain(DATASET_A_ID);
  });

  it("does not persist workspace A's thread under workspace B's storage key", async () => {
    const router = await seedWorkspaceASession();
    // Precondition: workspace A's thread was persisted under A's key.
    expect(
      window.localStorage.getItem(
        makeThreadStorageKeyFromWorkspace(WORKSPACE_A),
      ),
    ).toContain(WORKSPACE_A_QUESTION);
    await switchToWorkspaceB(router);
    respondWithSql(makeSqlFromDatasetId(DATASET_B_ID));

    await sendChatMessage(WORKSPACE_B_QUESTION);

    const workspaceBThread = window.localStorage.getItem(
      makeThreadStorageKeyFromWorkspace(WORKSPACE_B),
    );
    expect(workspaceBThread).toContain(WORKSPACE_B_QUESTION);
    expect(workspaceBThread).not.toContain(WORKSPACE_A_QUESTION);
  });
});
