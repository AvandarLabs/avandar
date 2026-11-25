import { beforeEach, describe, expect, it, vi } from "vitest";
import { CrosswalkDraft } from "@/lib/crosswalks/CrosswalkDraft/CrosswalkDraft";
import { act, renderHook, TestProviders } from "@/test-utils";
import {
  CROSSWALK_ID,
  makeSeededState,
} from "@/views/DataManagerApp/CrosswalkView/__tests__/crosswalk.fixtures";
import { useSaveCrosswalk } from "@/views/DataManagerApp/CrosswalkView/useSaveCrosswalk/useSaveCrosswalk";

const mocks = vi.hoisted(() => {
  return {
    insert: vi.fn(),
    saveContents: vi.fn(),
    remove: vi.fn(),
    getById: vi.fn(),
    invalidateQueries: vi.fn(),
    notifyError: vi.fn(),
    isOnline: true,
    hasProfile: true,
  };
});

function _named(name: string) {
  return {
    getClientName: () => {
      return name;
    },
  };
}

vi.mock("@/clients/crosswalks/CrosswalkClient", () => {
  return {
    CrosswalkClient: {
      ..._named("CrosswalkClient"),
      insert: mocks.insert,
      saveContents: mocks.saveContents,
      delete: mocks.remove,
      getById: mocks.getById,
    },
  };
});
vi.mock("@/clients/crosswalks/CrosswalkColumnClient", () => {
  return { CrosswalkColumnClient: _named("CrosswalkColumnClient") };
});
vi.mock("@/clients/crosswalks/CrosswalkLayoutClient", () => {
  return { CrosswalkLayoutClient: _named("CrosswalkLayoutClient") };
});
vi.mock("@/clients/crosswalks/CrosswalkDatasetClient", () => {
  return { CrosswalkDatasetClient: _named("CrosswalkDatasetClient") };
});
vi.mock("@/clients/crosswalks/CrosswalkMappingClient", () => {
  return { CrosswalkMappingClient: _named("CrosswalkMappingClient") };
});
vi.mock("@avandar/browser-utils", async (importOriginal) => {
  const original = await importOriginal<object>();
  return {
    ...original,
    getIsOnline: () => {
      return mocks.isOnline;
    },
  };
});
vi.mock("@tanstack/react-query", async (importOriginal) => {
  const original = await importOriginal<object>();
  return {
    ...original,
    useQueryClient: () => {
      return { invalidateQueries: mocks.invalidateQueries };
    },
  };
});
vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: () => {
      return { id: "workspace-1", slug: "demo" };
    },
  };
});
vi.mock("@/hooks/users/useCurrentUserProfile", () => {
  return {
    useCurrentUserProfile: () => {
      return [
        mocks.hasProfile
          ? { userId: "user-1", profileId: "profile-1" }
          : undefined,
        false,
        {},
      ];
    },
  };
});
vi.mock("@/utils/notifications/notify", () => {
  return { notifyError: mocks.notifyError, notifySuccess: vi.fn() };
});

function _renderSave() {
  const dispatch = vi.fn();
  const { result } = renderHook(
    () => {
      return useSaveCrosswalk(dispatch);
    },
    { wrapper: TestProviders },
  );
  return { result, dispatch };
}

describe("useSaveCrosswalk", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isOnline = true;
    mocks.hasProfile = true;
    mocks.saveContents.mockResolvedValue(undefined);
    mocks.insert.mockResolvedValue({ id: CROSSWALK_ID });
    mocks.remove.mockResolvedValue(undefined);
    mocks.getById.mockResolvedValue(undefined);
    mocks.invalidateQueries.mockResolvedValue(undefined);
  });

  it("saves a crosswalk that exists and marks the draft saved", async () => {
    const draft = { ...makeSeededState().draft, isSaved: true };
    const { result, dispatch } = _renderSave();

    let isSaved = false;
    await act(async () => {
      isSaved = await result.current[0](draft);
    });

    expect(isSaved).toBe(true);
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(mocks.saveContents).toHaveBeenCalledWith(
      CrosswalkDraft.toSavePayload(draft),
    );
    expect(dispatch).toHaveBeenCalledWith({ type: "saved", draft });
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["CrosswalkClient"],
    });
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["CrosswalkMappingClient"],
    });
  });

  it("creates a new crosswalk as its owner before saving its contents", async () => {
    const draft = makeSeededState().draft;
    const { result, dispatch } = _renderSave();

    await act(async () => {
      await result.current[0](draft);
    });

    expect(mocks.insert).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: CROSSWALK_ID,
        workspaceId: "workspace-1",
        ownerId: "user-1",
        ownerProfileId: "profile-1",
        name: "Measles line lists",
      }),
    });
    expect(mocks.insert.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.saveContents.mock.invocationCallOrder[0] ?? 0,
    );
    expect(dispatch).toHaveBeenCalledWith({
      type: "saved",
      draft: { ...draft, isSaved: true },
    });
  });

  it("reuses a crosswalk row an earlier attempt left behind", async () => {
    mocks.getById.mockResolvedValue({ id: CROSSWALK_ID });
    const { result } = _renderSave();

    await act(async () => {
      await result.current[0](makeSeededState().draft);
    });

    expect(mocks.insert).not.toHaveBeenCalled();
    expect(mocks.saveContents).toHaveBeenCalledTimes(1);
  });

  it("explains a refusal and removes the row it just created", async () => {
    mocks.saveContents.mockRejectedValue({ hint: "reference_layout_required" });
    const { result, dispatch } = _renderSave();

    let isSaved = true;
    await act(async () => {
      isSaved = await result.current[0](makeSeededState().draft);
    });

    expect(isSaved).toBe(false);
    expect(dispatch).not.toHaveBeenCalled();
    expect(mocks.remove).toHaveBeenCalledWith({ id: CROSSWALK_ID });
    expect(mocks.notifyError).toHaveBeenCalledWith(
      "Choose a reference layout before saving.",
    );
  });

  it("ignores a second save while one is in flight", async () => {
    let finishSave: () => void = () => {};
    mocks.saveContents.mockReturnValue(
      new Promise<void>((resolve) => {
        finishSave = resolve;
      }),
    );
    const draft = { ...makeSeededState().draft, isSaved: true };
    const { result } = _renderSave();

    let secondResult = true;
    await act(async () => {
      const first = result.current[0](draft);
      secondResult = await result.current[0](draft);
      finishSave();
      await first;
    });

    expect(secondResult).toBe(false);
    expect(mocks.saveContents).toHaveBeenCalledTimes(1);
  });

  it("says so, and sends nothing, while the user's profile has not loaded", async () => {
    mocks.hasProfile = false;
    const { result } = _renderSave();

    let isSaved = true;
    await act(async () => {
      isSaved = await result.current[0]({
        ...makeSeededState().draft,
        isSaved: true,
      });
    });

    expect(isSaved).toBe(false);
    expect(mocks.saveContents).not.toHaveBeenCalled();
    expect(mocks.notifyError).toHaveBeenCalledWith(
      "Your profile is still loading. Try again.",
    );
  });

  it("says the user is offline and sends nothing", async () => {
    mocks.isOnline = false;
    const { result } = _renderSave();

    await act(async () => {
      await result.current[0]({ ...makeSeededState().draft, isSaved: true });
    });

    expect(mocks.saveContents).not.toHaveBeenCalled();
    expect(mocks.notifyError).toHaveBeenCalledWith(
      "You're offline. Reconnect to save this.",
    );
  });
});
