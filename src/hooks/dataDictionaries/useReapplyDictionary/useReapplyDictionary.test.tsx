import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { DatasetQueryClient } from "@/clients/datasets/DatasetQueryClient";
import { useReapplyDictionary } from "@/hooks/dataDictionaries/useReapplyDictionary/useReapplyDictionary";
import { act, renderHook, TestProviders } from "@/test-utils";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { ReactNode } from "react";

const mocks = vi.hoisted(() => {
  return {
    isOnline: true,
    mutate: vi.fn(),
    options: undefined as
      | undefined
      | {
          onSuccess: () => Promise<void>;
          onError: (error: unknown) => void;
          onSettled: () => void;
        },
    notifyError: vi.fn(),
    notifySuccess: vi.fn(),
  };
});

vi.mock("@avandar/browser-utils", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@avandar/browser-utils")>();
  return {
    ...actual,
    getIsOnline: () => {
      return mocks.isOnline;
    },
  };
});
vi.mock("@/clients/dataDictionaries/DictionaryBindingClient", () => {
  return {
    DictionaryBindingClient: {
      getClientName: () => {
        return "DictionaryBindingClient";
      },
      useReapplyDictionary: (options: typeof mocks.options) => {
        mocks.options = options;
        return [mocks.mutate, false];
      },
    },
  };
});
vi.mock("@/utils/notifications/notify", () => {
  return { notifyError: mocks.notifyError, notifySuccess: mocks.notifySuccess };
});

const OPTIONS = {
  datasetId: "dataset-1" as Dataset.Id,
  datasetName: "Kings line list",
  dictionaryId: "dict-1" as DataDictionary.Id,
  dictionaryName: "NYS codes",
};

function _render(queryClient = new QueryClient()) {
  return renderHook(
    () => {
      return useReapplyDictionary(OPTIONS);
    },
    {
      wrapper: ({ children }: { children: ReactNode }) => {
        return (
          <QueryClientProvider client={queryClient}>
            <TestProviders>{children}</TestProviders>
          </QueryClientProvider>
        );
      },
    },
  );
}

describe("useReapplyDictionary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isOnline = true;
  });

  it("re-applies once while a re-apply is in flight", () => {
    const { result } = _render();

    act(() => {
      result.current[0]();
      result.current[0]();
    });

    expect(mocks.mutate).toHaveBeenCalledTimes(1);
    expect(mocks.mutate).toHaveBeenCalledWith({
      datasetId: "dataset-1",
      dictionaryId: "dict-1",
    });
  });

  it("says so and sends nothing offline", () => {
    mocks.isOnline = false;
    const { result } = _render();

    act(() => {
      result.current[0]();
    });

    expect(mocks.mutate).not.toHaveBeenCalled();
    expect(mocks.notifyError).toHaveBeenCalledWith(
      "You're offline. Reconnect to save this.",
    );
  });

  it("refreshes the bindings, the columns, and the shown rows", async () => {
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    _render(queryClient);

    await act(async () => {
      await mocks.options?.onSuccess();
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["DictionaryBindingClient"],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: [DatasetColumnClient.getClientName()],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: [DatasetQueryClient.getClientName()],
    });
    expect(mocks.notifySuccess).toHaveBeenCalledWith(
      "Re-applied NYS codes to Kings line list.",
    );
  });

  it("explains a dataset that is already current", () => {
    _render();

    act(() => {
      mocks.options?.onError({ hint: "nothing_to_reapply" });
    });

    expect(mocks.notifyError).toHaveBeenCalledWith(
      "Kings line list already has the current version of NYS codes.",
    );
  });
});
