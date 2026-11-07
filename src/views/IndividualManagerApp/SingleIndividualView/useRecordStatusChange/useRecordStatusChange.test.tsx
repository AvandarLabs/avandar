import { PostgrestError } from "@supabase/supabase-js";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, TestProviders } from "@/test-utils";
import { useRecordStatusChange } from "@/views/IndividualManagerApp/SingleIndividualView/useRecordStatusChange/useRecordStatusChange";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";
import type { Individual } from "$/models/ontology/Individual/Individual";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { ReactNode } from "react";

type UpdateOptions = {
  onSuccess: () => Promise<void>;
  onError: (error: unknown) => void;
};

const {
  updateMock,
  invalidateMock,
  notifyErrorMock,
  updateOptionsRef,
  isUpdatePendingRef,
} = vi.hoisted(() => {
  return {
    updateMock: vi.fn(),
    invalidateMock: vi.fn(),
    notifyErrorMock: vi.fn(),
    updateOptionsRef: { current: undefined as UpdateOptions | undefined },
    isUpdatePendingRef: { current: false },
  };
});

vi.mock("@/clients/ontology/IndividualClient", () => {
  return {
    IndividualClient: {
      useUpdate: (options: UpdateOptions) => {
        updateOptionsRef.current = options;
        return [updateMock, isUpdatePendingRef.current];
      },
    },
  };
});

vi.mock(
  "@/views/IndividualManagerApp/invalidateCaseStatusQueries/invalidateCaseStatusQueries",
  () => {
    return { invalidateCaseStatusQueries: invalidateMock };
  },
);

vi.mock("@/utils/notifications/notify", () => {
  return { notifyError: notifyErrorMock, notifySuccess: vi.fn() };
});

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    useRouter: () => {
      return { invalidate: vi.fn() };
    },
  };
});

const SUSPECTED_ID = "00000000-0000-4000-8000-0000000000a1" as ConceptStatus.Id;
const CONFIRMED_ID = "00000000-0000-4000-8000-0000000000a2" as ConceptStatus.Id;
const CLOSED_ID = "00000000-0000-4000-8000-0000000000a3" as ConceptStatus.Id;

const RECORD: Individual.T = {
  assignedTo: undefined,
  conceptId: "00000000-0000-4000-8000-0000000000c1" as Concept.Id,
  createdAt: "2026-10-20T12:00:00.000Z",
  externalId: "CH-0001",
  id: "00000000-0000-4000-8000-0000000000d1" as Individual.Id,
  missingFromSourceAt: undefined,
  name: "Case 001",
  statusId: SUSPECTED_ID,
  updatedAt: "2026-10-24T12:00:00.000Z",
  workspaceId: "00000000-0000-4000-8000-0000000000e1" as Workspace.Id,
};

function _makeWrapper(): (props: { children: ReactNode }) => JSX.Element {
  const queryClient = new QueryClient();
  return ({ children }) => {
    return createElement(
      TestProviders,
      null,
      createElement(QueryClientProvider, { client: queryClient }, children),
    );
  };
}

type StatusChangeResult = {
  current: ReturnType<typeof useRecordStatusChange>;
};

function _renderStatusChange(): StatusChangeResult {
  const { result } = renderHook(
    () => {
      return useRecordStatusChange(RECORD);
    },
    { wrapper: _makeWrapper() },
  );
  act(() => {
    result.current.changeStatus(CONFIRMED_ID);
  });
  return result;
}

describe("useRecordStatusChange", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isUpdatePendingRef.current = false;
    updateMock.mockImplementation(() => {
      isUpdatePendingRef.current = true;
    });
    invalidateMock.mockResolvedValue(undefined);
  });

  it("shows the picked status while the change is being saved", () => {
    const result = _renderStatusChange();

    expect(result.current.displayedStatusId).toBe(CONFIRMED_ID);
    expect(updateMock).toHaveBeenCalledWith({
      id: RECORD.id,
      data: { statusId: CONFIRMED_ID },
    });
  });

  it("ignores a second pick while the first one is still being saved", () => {
    const result = _renderStatusChange();

    act(() => {
      result.current.changeStatus(CLOSED_ID);
    });

    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(result.current.displayedStatusId).toBe(CONFIRMED_ID);
    expect(result.current.isSaving).toBe(true);
  });

  it("goes back to the saved status and says so when the change fails", () => {
    const result = _renderStatusChange();

    act(() => {
      updateOptionsRef.current?.onError(new Error("network down"));
    });

    expect(result.current.displayedStatusId).toBe(SUSPECTED_ID);
    expect(notifyErrorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "The record keeps its previous status. Try again in a moment.",
      }),
    );
  });

  it("explains a refused change in terms of the Case Records editor role", () => {
    _renderStatusChange();

    act(() => {
      updateOptionsRef.current?.onError(
        new PostgrestError({
          message: "permission denied to change a record's status",
          details: "",
          hint: "case_records_editor_required",
          code: "42501",
        }),
      );
    });

    expect(notifyErrorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message:
          "You need Case Records editor access to change a record's status.",
      }),
    );
  });

  it("refreshes every view of the case type's statuses once the change is saved", async () => {
    _renderStatusChange();

    await act(async () => {
      await updateOptionsRef.current?.onSuccess();
    });

    expect(invalidateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        conceptId: RECORD.conceptId,
        change: "recordStatus",
      }),
    );
  });
});
