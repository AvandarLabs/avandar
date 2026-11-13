import { Model } from "@avandar/models";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/test-utils";
import { DatasetActionsMenu } from "@/views/DataManagerApp/DatasetMetaView/DatasetActionsMenu/DatasetActionsMenu";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

const { navigateMock, permissionState } = vi.hoisted(() => {
  return {
    navigateMock: vi.fn(),
    permissionState: {
      canEditDictionaries: true,
      canViewDictionaries: true,
      canEditDataset: true,
      hasBindings: false,
      hasBindingsError: false,
      isLoadingLinkedDatasets: false,
    },
  };
});

vi.mock("@/hooks/permissions/useHasPermission/useHasPermission", () => {
  return {
    useHasPermission: (permission: string) => {
      return permission === "data_sources__can_edit_dictionaries"
        ? permissionState.canEditDictionaries
        : permissionState.canViewDictionaries;
    },
  };
});

vi.mock("@/hooks/datasets/useCanEditDataset/useCanEditDataset", () => {
  return {
    useCanEditDataset: () => {
      return { canEdit: permissionState.canEditDataset, isLoading: false };
    },
  };
});

vi.mock("@/hooks/dataDictionaries/useDatasetHasBindings", () => {
  return {
    useDatasetHasBindings: () => {
      return {
        hasBindings: permissionState.hasBindings,
        isLoading: false,
        isError: permissionState.hasBindingsError,
      };
    },
  };
});

vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: () => {
      return { id: "workspace-id", slug: "demo" };
    },
  };
});

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    useNavigate: () => {
      return navigateMock;
    },
  };
});

vi.mock("@/clients/datasets/DatasetClient/DatasetClient", () => {
  return {
    DatasetClient: {
      useFullDelete: () => {
        return [vi.fn(), false];
      },
      QueryKeys: {
        getAll: () => {
          return ["DatasetClient", "getAll"];
        },
      },
    },
  };
});

vi.mock("@/hooks/datasets/useLinkedDatasets/useLinkedDatasets", () => {
  return {
    useLinkedDatasets: () => {
      return {
        linkedDatasets: [],
        isLoading: permissionState.isLoadingLinkedDatasets,
      };
    },
  };
});

vi.mock(
  "@/views/DataManagerApp/DatasetMetaView/DatasetActionsMenu/DatasetRefreshMenuItem",
  () => {
    return {
      DatasetRefreshMenuItem: () => {
        return null;
      },
    };
  },
);

const DATASET = Model.make("Dataset", {
  id: "00000000-0000-4000-8000-00000000000a" as Dataset.Id,
  name: "Kings line list",
  sourceType: "csv_file",
  workspaceId:
    "00000000-0000-4000-8000-000000000001" as Dataset.T["workspaceId"],
  ownerId: "00000000-0000-4000-8000-000000000003" as Dataset.T["ownerId"],
  ownerProfileId:
    "00000000-0000-4000-8000-000000000004" as Dataset.T["ownerProfileId"],
  createdAt: "2026-11-01T00:00:00.000Z",
  updatedAt: "2026-11-01T00:00:00.000Z",
  dateOfLastSync: undefined,
  description: undefined,
  isRestricted: false,
});

describe("DatasetActionsMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    permissionState.canEditDictionaries = true;
    permissionState.canViewDictionaries = true;
    permissionState.canEditDataset = true;
    permissionState.hasBindings = false;
    permissionState.hasBindingsError = false;
    permissionState.isLoadingLinkedDatasets = false;
  });

  it("opens learning a dictionary from this dataset", async () => {
    render(<DatasetActionsMenu dataset={DATASET} />);
    fireEvent.click(
      screen.getByRole("button", { name: "More dataset actions" }),
    );
    fireEvent.click(
      await screen.findByRole("menuitem", {
        name: /Create a dictionary from this dataset/,
      }),
    );
    expect(navigateMock).toHaveBeenCalledWith({
      to: "/$workspaceSlug/data-manager/dictionaries/new",
      params: { workspaceSlug: "demo" },
      search: { fromDatasetId: DATASET.id },
    });
  });

  it("does not offer it to someone who cannot edit dictionaries", async () => {
    permissionState.canEditDictionaries = false;
    render(<DatasetActionsMenu dataset={DATASET} />);
    fireEvent.click(
      screen.getByRole("button", { name: "More dataset actions" }),
    );
    expect(
      await screen.findByRole("menuitem", { name: /Delete Dataset/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("menuitem", {
        name: /Create a dictionary from this dataset/,
      }),
    ).toBeNull();
  });

  it("opens applying a dictionary to this dataset", async () => {
    render(<DatasetActionsMenu dataset={DATASET} />);
    fireEvent.click(
      screen.getByRole("button", { name: "More dataset actions" }),
    );
    fireEvent.click(
      await screen.findByRole("menuitem", { name: /Apply a dictionary/ }),
    );
    expect(navigateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "/$workspaceSlug/data-manager/$datasetId/apply-dictionaries",
        params: { workspaceSlug: "demo", datasetId: DATASET.id },
      }),
    );
  });

  it("says Apply turns codes into labels", async () => {
    render(<DatasetActionsMenu dataset={DATASET} />);
    fireEvent.click(
      screen.getByRole("button", { name: "More dataset actions" }),
    );
    expect(
      await screen.findByRole("menuitem", { name: /Apply a dictionary/ }),
    ).toHaveTextContent("Turn codes into labels and add column descriptions");
  });

  it("does not offer Apply to someone who cannot edit the dataset", async () => {
    permissionState.canEditDataset = false;
    render(<DatasetActionsMenu dataset={DATASET} />);
    fireEvent.click(
      screen.getByRole("button", { name: "More dataset actions" }),
    );
    expect(
      await screen.findByRole("menuitem", { name: /Delete Dataset/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("menuitem", { name: /Apply a dictionary/ }),
    ).toBeNull();
  });

  it("stops offering to learn a dictionary once one is attached", async () => {
    permissionState.hasBindings = true;
    render(<DatasetActionsMenu dataset={DATASET} />);
    fireEvent.click(
      screen.getByRole("button", { name: "More dataset actions" }),
    );
    expect(
      await screen.findByRole("menuitem", { name: /Apply a dictionary/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("menuitem", {
        name: /Create a dictionary from this dataset/,
      }),
    ).toBeNull();
  });

  it("does not offer to learn a dictionary when the bindings cannot be read", async () => {
    permissionState.hasBindingsError = true;
    render(<DatasetActionsMenu dataset={DATASET} />);
    fireEvent.click(
      screen.getByRole("button", { name: "More dataset actions" }),
    );
    expect(
      await screen.findByRole("menuitem", { name: /Apply a dictionary/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("menuitem", {
        name: /Create a dictionary from this dataset/,
      }),
    ).toBeNull();
  });

  it("keeps Delete disabled until the linked datasets are known", async () => {
    permissionState.isLoadingLinkedDatasets = true;
    render(<DatasetActionsMenu dataset={DATASET} />);
    fireEvent.click(
      screen.getByRole("button", { name: "More dataset actions" }),
    );

    expect(
      await screen.findByRole("menuitem", { name: /Delete Dataset/ }),
    ).toBeDisabled();
  });
});
