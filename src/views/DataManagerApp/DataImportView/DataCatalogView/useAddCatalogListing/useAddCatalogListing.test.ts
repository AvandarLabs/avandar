import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { renderHook, TestProviders } from "@/test-utils";
import { useAddCatalogListing } from "@/views/DataManagerApp/DataImportView/DataCatalogView/useAddCatalogListing/useAddCatalogListing";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { ReactNode } from "react";

const WORKSPACE_ID = "00000000-0000-4000-8000-000000000002" as Workspace.Id;

const { useInsertOpenDataDatasetMock } = vi.hoisted(() => {
  return { useInsertOpenDataDatasetMock: vi.fn() };
});

vi.mock(
  "@/clients/datasets/DatasetClient/DatasetClient",
  async (importOriginal) => {
    const original =
      await importOriginal<
        typeof import("@/clients/datasets/DatasetClient/DatasetClient")
      >();
    return {
      DatasetClient: {
        ...original.DatasetClient,
        useInsertOpenDataDataset: useInsertOpenDataDatasetMock,
      },
    };
  },
);

vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: () => {
      return { id: WORKSPACE_ID };
    },
  };
});

function _wrapper({ children }: { children: ReactNode }): JSX.Element {
  return createElement(TestProviders, null, children);
}

/** The cache keys the add flow refreshes once a listing is saved. */
function _getInvalidatedQueryKeys(): unknown[] {
  useInsertOpenDataDatasetMock.mockReturnValue([vi.fn(), false, {}]);
  renderHook(
    () => {
      return useAddCatalogListing();
    },
    { wrapper: _wrapper },
  );
  const [options] = useInsertOpenDataDatasetMock.mock.calls[0] as [
    { queriesToInvalidate: unknown[] },
  ];
  return options.queriesToInvalidate;
}

describe("useAddCatalogListing", () => {
  it("refreshes the workspace's dataset columns after adding a listing", () => {
    expect(_getInvalidatedQueryKeys()).toContainEqual(
      DatasetColumnClient.QueryKeys.getAll(),
    );
  });
});
