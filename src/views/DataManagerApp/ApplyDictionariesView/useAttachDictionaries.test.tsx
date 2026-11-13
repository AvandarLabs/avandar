import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, TestProviders } from "@/test-utils";
import { useAttachDictionaries } from "@/views/DataManagerApp/ApplyDictionariesView/useAttachDictionaries";
import type { DictionaryBinding } from "$/models/dataDictionaries/DictionaryBinding/DictionaryBinding";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

const mocks = vi.hoisted(() => {
  return {
    applyMock: vi.fn(),
    navigateMock: vi.fn(),
    notifyErrorMock: vi.fn(),
    notifySuccessMock: vi.fn(),
    options: undefined as
      | undefined
      | {
          onSuccess: () => void;
          onError: (error: unknown) => void;
          onSettled: () => void;
        },
  };
});

vi.mock("@/clients/dataDictionaries/DictionaryBindingClient", () => {
  return {
    DictionaryBindingClient: {
      getClientName: () => {
        return "DictionaryBindingClient";
      },
      useApplyToDataset: (options: typeof mocks.options) => {
        mocks.options = options;
        return [mocks.applyMock, false];
      },
    },
  };
});
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

const DATASET = { id: "dataset-1", name: "Kings line list" } as Dataset.T;
const BINDINGS = [{ datasetColumnId: "col-1" }] as DictionaryBinding.Input[];

describe("useAttachDictionaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends one apply while the first is in flight", () => {
    const { result } = renderHook(
      () => {
        return useAttachDictionaries(DATASET);
      },
      { wrapper: TestProviders },
    );

    act(() => {
      result.current[0](BINDINGS);
      result.current[0](BINDINGS);
    });

    expect(mocks.applyMock).toHaveBeenCalledTimes(1);
    expect(mocks.applyMock).toHaveBeenCalledWith({
      datasetId: DATASET.id,
      bindings: BINDINGS,
    });
  });

  it("returns to the dataset once the dictionaries are attached", () => {
    renderHook(
      () => {
        return useAttachDictionaries(DATASET);
      },
      { wrapper: TestProviders },
    );

    act(() => {
      mocks.options?.onSuccess();
    });

    expect(mocks.notifySuccessMock).toHaveBeenCalledWith(
      "Attached to Kings line list. The data is unchanged.",
    );
    expect(mocks.navigateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "/$workspaceSlug/data-manager/$datasetId",
        params: { workspaceSlug: "demo", datasetId: DATASET.id },
      }),
    );
  });

  it("says the dictionaries were removed after a remove-only apply", () => {
    const { result } = renderHook(
      () => {
        return useAttachDictionaries(DATASET);
      },
      { wrapper: TestProviders },
    );

    act(() => {
      result.current[0]([]);
      mocks.options?.onSuccess();
    });

    expect(mocks.notifySuccessMock).toHaveBeenCalledWith(
      "Removed the dictionaries from Kings line list. The data is unchanged.",
    );
  });

  it("does not navigate once the user has left the view", () => {
    const { unmount } = renderHook(
      () => {
        return useAttachDictionaries(DATASET);
      },
      { wrapper: TestProviders },
    );
    unmount();

    mocks.options?.onSuccess();

    expect(mocks.navigateMock).not.toHaveBeenCalled();
  });

  it("explains a refusal for someone who cannot edit the dataset", () => {
    renderHook(
      () => {
        return useAttachDictionaries(DATASET);
      },
      { wrapper: TestProviders },
    );

    act(() => {
      mocks.options?.onError({ hint: "dataset_editor_required" });
    });

    expect(mocks.notifyErrorMock).toHaveBeenCalledWith(
      "You need edit access to Kings line list to apply a dictionary.",
    );
  });

  it("asks for a reload when a column left the dataset", () => {
    renderHook(
      () => {
        return useAttachDictionaries(DATASET);
      },
      { wrapper: TestProviders },
    );

    act(() => {
      mocks.options?.onError({ hint: "column_not_in_dataset" });
    });

    expect(mocks.notifyErrorMock).toHaveBeenCalledWith(
      "A dictionary changed while you were applying it. Reload the page and try again.",
    );
  });

  it("explains a refusal for someone who can no longer read a dictionary", () => {
    renderHook(
      () => {
        return useAttachDictionaries(DATASET);
      },
      { wrapper: TestProviders },
    );

    act(() => {
      mocks.options?.onError({ hint: "dictionary_viewer_required" });
    });

    expect(mocks.notifyErrorMock).toHaveBeenCalledWith(
      "You can no longer read one of these dictionaries, so it was not attached. Ask an admin for access to dictionaries.",
    );
  });
});
