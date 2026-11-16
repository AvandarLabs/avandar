import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, TestProviders } from "@/test-utils";
import { useSaveApply } from "@/views/DataManagerApp/ApplyDictionariesView/useSaveApply";
import type { DictionaryBinding } from "$/models/dataDictionaries/DictionaryBinding/DictionaryBinding";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

type MutationOptions = {
  onSuccess: (data: unknown, variables: Record<string, unknown>) => void;
  onError: (error: unknown) => void;
  onSettled: () => void;
};

const mocks = vi.hoisted(() => {
  return {
    applyMock: vi.fn(),
    linkMock: vi.fn(),
    navigateMock: vi.fn(),
    notifyErrorMock: vi.fn(),
    notifySuccessMock: vi.fn(),
    invalidateMock: vi.fn(() => {
      return Promise.resolve();
    }),
    isOnline: true,
    applyOptions: undefined as MutationOptions | undefined,
    linkOptions: undefined as MutationOptions | undefined,
  };
});

vi.mock("@/clients/dataDictionaries/DictionaryBindingClient", () => {
  return {
    DictionaryBindingClient: {
      useApplyToDataset: (options: MutationOptions) => {
        mocks.applyOptions = options;
        return [mocks.applyMock, false];
      },
      useApplyAsLinkedDataset: (options: MutationOptions) => {
        mocks.linkOptions = options;
        return [mocks.linkMock, false];
      },
    },
  };
});
vi.mock(
  "@/views/DataManagerApp/ApplyDictionariesView/invalidateAfterApply/invalidateAfterApply",
  () => {
    return { invalidateAfterApply: mocks.invalidateMock };
  },
);
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
      return {};
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
const BINDINGS = [
  { datasetColumnId: "col-1", mode: "convert" },
] as DictionaryBinding.Input[];
const ADDED = [
  { codeListId: "list-1", code: "4", label: "Other" },
] as DictionaryBinding.AddedPair[];

function _renderSave() {
  return renderHook(
    () => {
      return useSaveApply(DATASET);
    },
    { wrapper: TestProviders },
  );
}

describe("useSaveApply", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isOnline = true;
  });

  it("sends one save while the first is in flight", () => {
    const { result } = _renderSave();

    act(() => {
      result.current[0]({
        kind: "attach",
        bindings: BINDINGS,
        addedPairs: ADDED,
      });
      result.current[0]({
        kind: "attach",
        bindings: BINDINGS,
        addedPairs: ADDED,
      });
    });

    expect(mocks.applyMock).toHaveBeenCalledTimes(1);
    expect(mocks.applyMock).toHaveBeenCalledWith({
      datasetId: DATASET.id,
      bindings: BINDINGS,
      addedPairs: ADDED,
    });
  });

  it("creates a linked dataset, refreshes, and opens it", () => {
    const { result } = _renderSave();

    act(() => {
      result.current[0]({
        kind: "linked",
        linkedDatasetName: "  Kings (labeled) ",
        bindings: BINDINGS,
        addedPairs: ADDED,
      });
    });
    const [variables] = mocks.linkMock.mock.calls[0] ?? [];
    expect(variables).toMatchObject({
      sourceDatasetId: DATASET.id,
      linkedDatasetName: "Kings (labeled)",
      bindings: BINDINGS,
      addedPairs: ADDED,
    });
    act(() => {
      mocks.linkOptions?.onSuccess(variables.linkedDatasetId, variables);
    });

    expect(mocks.invalidateMock).toHaveBeenCalledWith(expect.anything(), {
      hasAddedPairs: true,
    });
    expect(mocks.notifySuccessMock).toHaveBeenCalledWith(
      "Created Kings (labeled). The code lists are attached to Kings line list for reference.",
    );
    expect(mocks.navigateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        params: { workspaceSlug: "demo", datasetId: variables.linkedDatasetId },
      }),
    );
  });

  it("says so, and sends nothing, while offline", () => {
    mocks.isOnline = false;
    const { result } = _renderSave();

    act(() => {
      result.current[0]({ kind: "attach", bindings: [], addedPairs: [] });
    });

    expect(mocks.applyMock).not.toHaveBeenCalled();
    expect(mocks.notifyErrorMock).toHaveBeenCalledWith(
      "You're offline. Reconnect to save this.",
    );
  });

  it("explains a refusal from its hint", () => {
    _renderSave();

    act(() => {
      mocks.applyOptions?.onError({ hint: "dataset_has_linked_datasets" });
    });

    expect(mocks.notifyErrorMock).toHaveBeenCalledWith(
      "A linked dataset reads Kings line list, so it can't be changed in place. Convert in the linked dataset instead.",
    );
  });
});
