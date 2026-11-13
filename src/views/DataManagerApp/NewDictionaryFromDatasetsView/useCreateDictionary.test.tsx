import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, TestProviders, waitFor } from "@/test-utils";
import { DictionaryLeftBehindError } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/createDictionaryFromDraft/createDictionaryFromDraft";
import { useCreateDictionary } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useCreateDictionary";
import type { CreateDictionaryVariables } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useCreateDictionary";
import type { ReactNode } from "react";

const mocks = vi.hoisted(() => {
  return {
    createMock: vi.fn(),
    navigateMock: vi.fn(),
    notifyErrorMock: vi.fn(),
    notifySuccessMock: vi.fn(),
  };
});

vi.mock(
  "@/views/DataManagerApp/NewDictionaryFromDatasetsView/createDictionaryFromDraft/createDictionaryFromDraft",
  async (importOriginal) => {
    const original =
      await importOriginal<
        typeof import("@/views/DataManagerApp/NewDictionaryFromDatasetsView/createDictionaryFromDraft/createDictionaryFromDraft")
      >();
    return { ...original, createDictionaryFromDraft: mocks.createMock };
  },
);
vi.mock("@tanstack/react-router", async (importOriginal) => {
  const original = await importOriginal<object>();
  return {
    ...original,
    useNavigate: () => {
      return mocks.navigateMock;
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
vi.mock("@/utils/notifications/notify", () => {
  return {
    notifyError: mocks.notifyErrorMock,
    notifySuccess: mocks.notifySuccessMock,
  };
});

const VARIABLES = {
  name: "Kings codes",
  applyNext: [],
} as unknown as CreateDictionaryVariables;

function _render() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
  const wrapper = (props: { children: ReactNode }): JSX.Element => {
    return (
      <TestProviders>
        <QueryClientProvider client={queryClient}>
          {props.children}
        </QueryClientProvider>
      </TestProviders>
    );
  };
  return {
    ...renderHook(
      () => {
        return useCreateDictionary();
      },
      { wrapper },
    ),
    invalidateSpy,
  };
}

describe("useCreateDictionary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("tells the user to delete the empty dictionary that was left behind, and refreshes the list", async () => {
    mocks.createMock.mockRejectedValue(
      new DictionaryLeftBehindError("Kings codes", { cause: new Error("x") }),
    );
    const { result, invalidateSpy } = _render();
    act(() => {
      result.current[0](VARIABLES);
    });
    await waitFor(() => {
      expect(mocks.notifyErrorMock).toHaveBeenCalledTimes(1);
    });
    expect(mocks.notifyErrorMock.mock.calls[0]?.[0]).toContain("Kings codes");
    expect(mocks.notifyErrorMock.mock.calls[0]?.[0]).toContain(
      "Delete it before trying again",
    );
    expect(invalidateSpy).toHaveBeenCalled();
  });

  it("refreshes the list when the save fails and the empty dictionary was removed", async () => {
    mocks.createMock.mockRejectedValue(new Error("save refused"));
    const { result, invalidateSpy } = _render();
    act(() => {
      result.current[0](VARIABLES);
    });
    await waitFor(() => {
      expect(mocks.notifyErrorMock).toHaveBeenCalledTimes(1);
    });
    expect(invalidateSpy).toHaveBeenCalled();
  });

  it("does not open the dictionary when the flow was left before the save finished", async () => {
    let finish: (value: unknown) => void = () => {
      return undefined;
    };
    mocks.createMock.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const { result, unmount } = _render();
    act(() => {
      result.current[0](VARIABLES);
    });
    unmount();
    finish({ id: "dictionary-1", name: "Kings codes" });
    await waitFor(() => {
      expect(mocks.notifySuccessMock).toHaveBeenCalledTimes(1);
    });
    expect(mocks.navigateMock).not.toHaveBeenCalled();
  });

  it("opens Apply for the dataset it was learned from when asked to apply it next", async () => {
    mocks.createMock.mockResolvedValue({
      id: "dictionary-1",
      name: "Kings codes",
    });
    const { result } = _render();
    act(() => {
      result.current[0]({
        ...VARIABLES,
        applyNext: [{ datasetId: "dataset-1", name: "Kings line list" }],
      } as unknown as CreateDictionaryVariables);
    });
    await waitFor(() => {
      expect(mocks.navigateMock).toHaveBeenCalledWith({
        key: "data-manager-apply-dictionaries",
        to: "/$workspaceSlug/data-manager/$datasetId/apply-dictionaries",
        params: { workspaceSlug: "demo", datasetId: "dataset-1" },
        label: expect.any(Function),
        isAvailableOffline: true,
        search: { dictionaryId: "dictionary-1" },
      });
    });
  });

  it("names the other datasets to apply it to in the toast", async () => {
    mocks.createMock.mockResolvedValue({
      id: "dictionary-1",
      name: "Kings codes",
    });
    const { result } = _render();
    act(() => {
      result.current[0]({
        ...VARIABLES,
        applyNext: [
          { datasetId: "dataset-1", name: "Kings line list" },
          { datasetId: "dataset-2", name: "Bronx line list" },
        ],
      } as unknown as CreateDictionaryVariables);
    });
    await waitFor(() => {
      expect(mocks.notifySuccessMock).toHaveBeenCalledWith(
        "Saved Kings codes to Dictionaries. Apply it to Bronx line list too, from each dataset's menu.",
      );
    });
  });
});
