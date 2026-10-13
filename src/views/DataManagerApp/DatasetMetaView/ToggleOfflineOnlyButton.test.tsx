import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DatasetParquetStorageClient } from "@/clients/storage/DatasetParquetStorageClient/DatasetParquetStorageClient";
import { TaskProgressStore } from "@/lib/utils/state/TaskProgressStore/TaskProgressStore";
import { render, screen } from "@/test-utils";
import { ToggleOfflineOnlyButton } from "./ToggleOfflineOnlyButton";
import type { CsvFileDataset } from "$/models/datasets/CsvFileDataset/CsvFileDataset";
import type { ReactNode } from "react";

vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: () => {
      return { id: "ws-1", slug: "ws-1" };
    },
  };
});

const DATA_SOURCE = {
  __type: "CsvFileDataset",
  id: "source-1",
  datasetId: "dataset-1",
} as unknown as CsvFileDataset.T;

function _renderWithQueryClient(ui: ReactNode): ReturnType<typeof render> {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(ui, {
    wrapper: ({ children }: { children: ReactNode }) => {
      return (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );
    },
  });
}

describe("ToggleOfflineOnlyButton", () => {
  beforeEach(() => {
    vi.spyOn(DatasetParquetStorageClient, "startDatasetUpload").mockReturnValue(
      new Promise(() => {}), // left pending for this test
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    TaskProgressStore.getAllTasks().forEach(({ id }) => {
      TaskProgressStore.finishTask(id);
    });
  });

  it("does not render an inline progress bar while a task is live in TaskProgressStore", () => {
    TaskProgressStore.startTask("Uploading dataset");

    _renderWithQueryClient(
      <ToggleOfflineOnlyButton
        isInCloudStorage={false}
        dataSource={DATA_SOURCE}
      />,
    );

    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });
});
