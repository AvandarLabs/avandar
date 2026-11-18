import { beforeEach, describe, expect, it, vi } from "vitest";
import { DatasetDeleteError } from "@/clients/datasets/DatasetClient/DatasetDeleteError";
import { fireEvent, render, screen, waitFor } from "@/test-utils";
import { ResyncDatasetCard } from "@/views/DataManagerApp/ResyncDatasetsBlock/ResyncDatasetCard";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

const mocks = vi.hoisted(() => {
  return {
    deleteOptions: undefined as
      | { onError?: (error: Error) => void }
      | undefined,
    deleteImplementation: vi.fn(),
    notifyError: vi.fn(),
    notifySuccess: vi.fn(),
  };
});

// The stand-in runs the mutation's `onError` before it rejects, as a real
// mutation does, so a caller that also reports the rejection shows twice.
vi.mock("@/clients/datasets/DatasetClient/DatasetClient", () => {
  return {
    DatasetClient: {
      QueryKeys: {
        getAll: () => {
          return ["DatasetClient", "getAll"];
        },
      },
      useFullDelete: (options: { onError?: (error: Error) => void }) => {
        mocks.deleteOptions = options;
        return [
          {
            async: async (variables: unknown) => {
              try {
                return await mocks.deleteImplementation(variables);
              } catch (error) {
                options.onError?.(error as Error);
                throw error;
              }
            },
          },
          false,
        ];
      },
    },
  };
});
vi.mock("@avandar/query-hooks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@avandar/query-hooks")>();
  return {
    ...actual,
    useMutation: () => {
      return [Object.assign(vi.fn(), { async: vi.fn() }), false];
    },
  };
});
vi.mock("@avandar/ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@avandar/ui")>();
  return {
    ...actual,
    DangerousActionButton: ({
      label,
      confirmModalProps,
    }: {
      label: string;
      confirmModalProps: { onConfirm: () => void };
    }) => {
      return (
        <button type="button" onClick={confirmModalProps.onConfirm}>
          {label}
        </button>
      );
    },
  };
});
vi.mock("@/clients/datasets/DatasetColumnClient", () => {
  return { DatasetColumnClient: {} };
});
vi.mock("@/clients/datasets/DatasetQueryClient", () => {
  return { DatasetQueryClient: {} };
});
vi.mock("@/clients/datasets/LocalDatasetClient/LocalDatasetClient", () => {
  return { LocalDatasetClient: {} };
});
vi.mock("@/clients/datasets/source-datasets/CsvFileDatasetClient", () => {
  return { CsvFileDatasetClient: {} };
});
vi.mock("@/clients/datasets/source-datasets/XlsxFileDatasetClient", () => {
  return { XlsxFileDatasetClient: {} };
});
vi.mock("@/components/DatasetPreviewBlock/DatasetPreviewBlock", () => {
  return {
    DatasetPreviewBlock: () => {
      return null;
    },
  };
});
vi.mock("@/hooks/users/useCurrentUser", () => {
  return {
    useCurrentUser: () => {
      return { id: "user-id" };
    },
  };
});
vi.mock("@/utils/Logger", () => {
  return { Logger: { error: vi.fn() } };
});
vi.mock("@/utils/notifications/notify", () => {
  return {
    notifyError: mocks.notifyError,
    notifySuccess: mocks.notifySuccess,
  };
});

const DATASET_ID = "11111111-1111-4111-8111-111111111111" as Dataset.Id;

function _renderCard(): void {
  render(
    <ResyncDatasetCard
      dataset={
        {
          id: DATASET_ID,
          name: "Districts",
          sourceType: "csv_file",
          workspaceId: "workspace-id",
        } as unknown as Dataset.T
      }
    />,
  );
}

describe("ResyncDatasetCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.deleteImplementation.mockResolvedValue(undefined);
  });

  it("says the dataset was deleted when the delete went through", async () => {
    _renderCard();

    fireEvent.click(screen.getByRole("button", { name: "Delete dataset" }));

    await waitFor(() => {
      expect(mocks.notifySuccess).toHaveBeenCalledWith(
        "Dataset deleted successfully",
      );
    });
    expect(mocks.notifyError).not.toHaveBeenCalled();
  });

  it("shows one message, saying the user may not delete it, when the delete is refused", async () => {
    mocks.deleteImplementation.mockRejectedValue(
      new DatasetDeleteError({ datasetId: DATASET_ID, reason: "not_allowed" }),
    );
    _renderCard();

    fireEvent.click(screen.getByRole("button", { name: "Delete dataset" }));

    await waitFor(() => {
      expect(mocks.notifyError).toHaveBeenCalledTimes(1);
    });
    expect(mocks.notifyError).toHaveBeenCalledWith({
      title: "Dataset not deleted",
      message: "You don't have permission to delete this dataset, or it has already been deleted.",
    });
    expect(mocks.notifySuccess).not.toHaveBeenCalled();
  });

  it("keeps the failure message for any other error, shown once", async () => {
    mocks.deleteImplementation.mockRejectedValue(new Error("storage down"));
    _renderCard();

    fireEvent.click(screen.getByRole("button", { name: "Delete dataset" }));

    await waitFor(() => {
      expect(mocks.notifyError).toHaveBeenCalledTimes(1);
    });
    expect(mocks.notifyError).toHaveBeenCalledWith("Failed to delete dataset");
  });
});
