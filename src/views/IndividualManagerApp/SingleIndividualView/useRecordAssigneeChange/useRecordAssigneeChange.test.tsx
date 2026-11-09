import { PostgrestError } from "@supabase/supabase-js";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, TestProviders } from "@/test-utils";
import { useRecordAssigneeChange } from "@/views/IndividualManagerApp/SingleIndividualView/useRecordAssigneeChange/useRecordAssigneeChange";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";
import type { Individual } from "$/models/ontology/Individual/Individual";
import type { User } from "$/models/User/User";
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

const MEMBER_ID = "00000000-0000-4000-8000-0000000000b1" as User.Id;
const OTHER_MEMBER_ID = "00000000-0000-4000-8000-0000000000b2" as User.Id;

const RECORD: Individual.T = {
  assignedTo: undefined,
  conceptId: "00000000-0000-4000-8000-0000000000c1" as Concept.Id,
  createdAt: "2026-10-20T12:00:00.000Z",
  externalId: "CH-0001",
  id: "00000000-0000-4000-8000-0000000000d1" as Individual.Id,
  missingFromSourceAt: undefined,
  name: "Case 001",
  statusId: "00000000-0000-4000-8000-0000000000a1" as ConceptStatus.Id,
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

function _renderAssigneeChange(individual: Individual.T = RECORD): {
  current: ReturnType<typeof useRecordAssigneeChange>;
} {
  const { result } = renderHook(
    () => {
      return useRecordAssigneeChange(individual);
    },
    { wrapper: _makeWrapper() },
  );
  return result;
}

function _failWithHint(hint: string): void {
  act(() => {
    updateOptionsRef.current?.onError(
      new PostgrestError({
        message: "refused",
        details: "",
        hint,
        code: "P0001",
      }),
    );
  });
}

describe("useRecordAssigneeChange", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isUpdatePendingRef.current = false;
    updateMock.mockImplementation(() => {
      isUpdatePendingRef.current = true;
    });
    invalidateMock.mockResolvedValue(undefined);
  });

  it("saves the picked member and ignores a second pick while that save is in flight", () => {
    const result = _renderAssigneeChange();

    act(() => {
      result.current.changeAssignee(MEMBER_ID);
    });
    act(() => {
      result.current.changeAssignee(OTHER_MEMBER_ID);
    });

    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(updateMock).toHaveBeenCalledWith({
      id: RECORD.id,
      data: { assignedTo: MEMBER_ID },
    });
    expect(result.current.displayedAssigneeId).toBe(MEMBER_ID);
    expect(result.current.isSaving).toBe(true);
  });

  it("clears the assignee when the pick is empty", () => {
    const result = _renderAssigneeChange({ ...RECORD, assignedTo: MEMBER_ID });

    act(() => {
      result.current.changeAssignee(undefined);
    });

    expect(updateMock).toHaveBeenCalledWith({
      id: RECORD.id,
      data: { assignedTo: undefined },
    });
    expect(result.current.displayedAssigneeId).toBeUndefined();
    expect(result.current.isSaving).toBe(true);
  });

  it("does not save when the pick is the current assignee", () => {
    const result = _renderAssigneeChange({ ...RECORD, assignedTo: MEMBER_ID });

    act(() => {
      result.current.changeAssignee(MEMBER_ID);
    });

    expect(updateMock).not.toHaveBeenCalled();
  });

  it("restores the previous assignee and says when the editor role is missing", () => {
    const result = _renderAssigneeChange();
    act(() => {
      result.current.changeAssignee(MEMBER_ID);
    });

    _failWithHint("case_records_editor_required");

    expect(result.current.displayedAssigneeId).toBeUndefined();
    expect(notifyErrorMock).toHaveBeenCalledWith({
      title: "Assignment not changed",
      message: "You need Case Records editor access to assign a record.",
    });
  });

  it("says when the picked person is not a member of the workspace", () => {
    const result = _renderAssigneeChange();
    act(() => {
      result.current.changeAssignee(MEMBER_ID);
    });

    _failWithHint("assignee_not_in_workspace");

    expect(notifyErrorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "That person is not a member of this workspace.",
      }),
    );
  });

  it("keeps the previous assignee and says to try again on any other failure", () => {
    const result = _renderAssigneeChange({ ...RECORD, assignedTo: MEMBER_ID });
    act(() => {
      result.current.changeAssignee(undefined);
    });

    act(() => {
      updateOptionsRef.current?.onError(new Error("network down"));
    });

    expect(result.current.displayedAssigneeId).toBe(MEMBER_ID);
    expect(notifyErrorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message:
          "The record keeps its previous assignee. Try again in a moment.",
      }),
    );
  });

  it("refreshes the record's views and settles once the change is saved", async () => {
    const result = _renderAssigneeChange();
    act(() => {
      result.current.changeAssignee(MEMBER_ID);
    });

    await act(async () => {
      await updateOptionsRef.current?.onSuccess();
    });

    expect(invalidateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        conceptId: RECORD.conceptId,
        change: "recordAssignment",
      }),
    );
    expect(result.current.displayedAssigneeId).toBeUndefined();
  });
});
