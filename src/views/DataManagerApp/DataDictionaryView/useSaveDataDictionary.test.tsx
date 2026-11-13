import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { act, renderHook, TestProviders } from "@/test-utils";
import { useSaveDataDictionary } from "@/views/DataManagerApp/DataDictionaryView/useSaveDataDictionary";
import type { ReactNode } from "react";

const mocks = vi.hoisted(() => {
  return {
    options: undefined as undefined | { onSuccess: () => Promise<void> },
  };
});

vi.mock(
  "@/clients/dataDictionaries/DataDictionaryClient/DataDictionaryClient",
  () => {
    return {
      DataDictionaryClient: {
        getClientName: () => {
          return "DataDictionaryClient";
        },
        useSaveContents: (options: typeof mocks.options) => {
          mocks.options = options;
          return [vi.fn(), false, { error: null, reset: vi.fn() }];
        },
      },
    };
  },
);
vi.mock("@/utils/notifications/notify", () => {
  return { notifySuccess: vi.fn() };
});

describe("useSaveDataDictionary", () => {
  it("refreshes where the dictionary is applied after a save", async () => {
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    renderHook(
      () => {
        return useSaveDataDictionary({ onSaved: vi.fn() });
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

    await act(async () => {
      await mocks.options?.onSuccess();
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["DictionaryBindingClient"],
    });
  });
});
