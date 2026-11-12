import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useDictionarySuggestions } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useDictionarySuggestions/useDictionarySuggestions";
import type { DictionarySuggestionsRequest } from "$/agent/dictionarySuggestions/dictionarySuggestionsPrompt";
import type { SuggestionConsent } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/newDictionaryReducer/newDictionaryReducer";

const mocks = vi.hoisted(() => {
  return { getModel: vi.fn(), approveRequest: vi.fn(), requestReply: vi.fn() };
});

vi.mock(
  "@/lib/dataDictionaries/DictionarySuggestions/DictionarySuggestions",
  () => {
    return {
      DictionarySuggestions: {
        getModelFromRuntimeState: mocks.getModel,
        approveRequest: mocks.approveRequest,
        requestReply: mocks.requestReply,
      },
    };
  },
);
vi.mock("@/lib/hooks/browser/useIsOnline/useIsOnline", () => {
  return {
    useIsOnline: () => {
      return true;
    },
  };
});
vi.mock("@/hooks/localChatModels/useIsOfflineModeOn", () => {
  return {
    useIsOfflineModeOn: () => {
      return false;
    },
  };
});
vi.mock("@/hooks/localChatModels/useIsOfflineBundleDownloaded", () => {
  return {
    useIsOfflineBundleDownloaded: () => {
      return false;
    },
  };
});
vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: () => {
      return { id: "workspace-id" };
    },
  };
});
vi.mock("@/hooks/users/useCurrentUserProfile", () => {
  return {
    useCurrentUserProfile: () => {
      return [{ userId: "user-id" }];
    },
  };
});
vi.mock("@/clients/APIClient", () => {
  return { APIClient: { post: vi.fn() } };
});
vi.mock("@/stores/OfflineChatEngineStore/OfflineChatEngineStore", () => {
  return { OfflineChatEngineStore: { complete: vi.fn() } };
});

const REQUEST: DictionarySuggestionsRequest = {
  task: "labels",
  locale: "en",
  column: {
    name: "gender",
    otherNames: [],
    kind: "categorical",
    values: ["1", "2"],
  },
};

function _render(consent: SuggestionConsent) {
  const onConsentDecided = vi.fn();
  const { result } = renderHook(() => {
    return useDictionarySuggestions({ consent, onConsentDecided });
  });
  return { suggestions: result.current, onConsentDecided };
}

describe("useDictionarySuggestions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getModel.mockReturnValue("online");
    mocks.requestReply.mockResolvedValue("{}");
  });

  it("shows declined online once the user said no, but not offline", () => {
    expect(_render("declined").suggestions.availability).toBe("declined");
    mocks.getModel.mockReturnValue("on_device");
    expect(_render("declined").suggestions.availability).toBe("on_device");
  });

  it("asks nothing on the offline model", async () => {
    mocks.getModel.mockReturnValue("on_device");
    const { suggestions } = _render("not_asked");
    await expect(suggestions.requestReply(REQUEST)).resolves.toBe("{}");
    expect(mocks.approveRequest).not.toHaveBeenCalled();
    expect(mocks.requestReply).toHaveBeenCalledWith(
      expect.objectContaining({ model: "on_device" }),
    );
  });

  it("asks on the first online send, then sends with the ack token", async () => {
    mocks.approveRequest.mockResolvedValue({
      type: "approved",
      ackToken: "ack-1",
    });
    const { suggestions, onConsentDecided } = _render("not_asked");
    await expect(suggestions.requestReply(REQUEST)).resolves.toBe("{}");
    expect(mocks.approveRequest).toHaveBeenCalledWith({
      request: REQUEST,
      workspaceId: "workspace-id",
      userId: "user-id",
      isConsentConfirmed: false,
    });
    expect(onConsentDecided).toHaveBeenCalledWith(true);
    expect(mocks.requestReply).toHaveBeenCalledWith(
      expect.objectContaining({ model: "online", ackToken: "ack-1" }),
    );
  });

  it("sends nothing and records the answer when the user declines", async () => {
    mocks.approveRequest.mockResolvedValue({ type: "declined" });
    const { suggestions, onConsentDecided } = _render("not_asked");
    await expect(suggestions.requestReply(REQUEST)).resolves.toBeUndefined();
    expect(onConsentDecided).toHaveBeenCalledWith(false);
    expect(mocks.requestReply).not.toHaveBeenCalled();
  });

  it("keeps the approval and fails the request when the consent left no ack token", async () => {
    mocks.approveRequest.mockResolvedValue({ type: "ack_missing" });
    const { suggestions, onConsentDecided } = _render("not_asked");
    await expect(suggestions.requestReply(REQUEST)).rejects.toThrow();
    expect(onConsentDecided).toHaveBeenCalledWith(true);
    expect(mocks.requestReply).not.toHaveBeenCalled();
  });

  it("stops forcing the prompt once agreed, and sends nothing once declined", async () => {
    mocks.approveRequest.mockResolvedValue({
      type: "approved",
      ackToken: "ack-2",
    });
    const agreed = _render("approved");
    await agreed.suggestions.requestReply(REQUEST);
    expect(mocks.approveRequest).toHaveBeenCalledWith(
      expect.objectContaining({ isConsentConfirmed: true }),
    );
    expect(agreed.onConsentDecided).not.toHaveBeenCalled();
    mocks.approveRequest.mockClear();
    const declined = _render("declined");
    await expect(
      declined.suggestions.requestReply(REQUEST),
    ).resolves.toBeUndefined();
    expect(mocks.approveRequest).not.toHaveBeenCalled();
  });
});
