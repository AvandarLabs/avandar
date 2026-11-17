import { beforeEach, describe, expect, it, vi } from "vitest";
import { DatasetDeleteError } from "@/clients/datasets/DatasetClient/DatasetDeleteError";
import { UninstallPluginError } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/UninstallPluginModal/uninstallPluginAndDeleteDatasets/UninstallPluginError";
import { uninstallPluginAndDeleteDatasets } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/UninstallPluginModal/uninstallPluginAndDeleteDatasets/uninstallPluginAndDeleteDatasets";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { PluginInstallation } from "$/models/PluginInstallation/PluginInstallation";

const mocks = vi.hoisted(() => {
  return {
    deleteInstallation: vi.fn(),
    getInstallationById: vi.fn(),
    fullDelete: vi.fn(),
    getDatasetById: vi.fn(),
    loggerError: vi.fn(),
    calls: [] as string[],
  };
});

vi.mock(
  "@/clients/plugins/PluginInstallationClient/PluginInstallationClient",
  () => {
    return {
      PluginInstallationClient: {
        delete: mocks.deleteInstallation,
        getById: mocks.getInstallationById,
      },
    };
  },
);
vi.mock("@/clients/datasets/DatasetClient/DatasetClient", () => {
  return {
    DatasetClient: {
      fullDelete: mocks.fullDelete,
      getById: mocks.getDatasetById,
    },
  };
});
vi.mock("@/utils/Logger", () => {
  return { Logger: { error: mocks.loggerError } };
});

const INSTALLATION_ID = "installation-1" as PluginInstallation.Id;
const PROVINCES_DATASET_ID = "dataset-provinces" as Dataset.Id;
const DISTRICTS_DATASET_ID = "dataset-districts" as Dataset.Id;

function _run(datasetIds: readonly Dataset.Id[]) {
  return uninstallPluginAndDeleteDatasets({
    installationId: INSTALLATION_ID,
    datasetIds,
  });
}

/** Runs an uninstall that is expected to throw and returns what it threw. */
async function _runAndCatch(
  datasetIds: readonly Dataset.Id[],
): Promise<unknown> {
  return await _run(datasetIds).catch((caught: unknown) => {
    return caught;
  });
}

function _notAllowed(datasetId: Dataset.Id): DatasetDeleteError {
  return new DatasetDeleteError({ datasetId, reason: "not_allowed" });
}

describe("uninstallPluginAndDeleteDatasets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.calls = [];
    mocks.deleteInstallation.mockImplementation(async () => {
      mocks.calls.push("uninstall");
    });
    mocks.getInstallationById.mockResolvedValue(undefined);
    mocks.getDatasetById.mockImplementation(async ({ id }: { id: string }) => {
      return { id };
    });
    mocks.fullDelete.mockImplementation(async ({ id }: { id: string }) => {
      mocks.calls.push(`delete ${id}`);
    });
  });

  it("uninstalls before it deletes any dataset", async () => {
    const outcome = await _run([PROVINCES_DATASET_ID, DISTRICTS_DATASET_ID]);

    expect(mocks.calls).toEqual([
      "uninstall",
      `delete ${PROVINCES_DATASET_ID}`,
      `delete ${DISTRICTS_DATASET_ID}`,
    ]);
    expect(outcome).toEqual({
      deletedDatasetIds: [PROVINCES_DATASET_ID, DISTRICTS_DATASET_ID],
      failedDatasetIds: [],
    });
  });

  it("deletes nothing when the uninstall throws", async () => {
    mocks.deleteInstallation.mockRejectedValue(new Error("network down"));

    await expect(_run([PROVINCES_DATASET_ID])).rejects.toThrow("network down");
    expect(mocks.fullDelete).not.toHaveBeenCalled();
  });

  it("deletes nothing when the install is still there after a delete that did not throw", async () => {
    mocks.getInstallationById.mockResolvedValue({ id: INSTALLATION_ID });

    const error = await _runAndCatch([PROVINCES_DATASET_ID]);

    expect(error).toBeInstanceOf(UninstallPluginError);
    expect(error).toMatchObject({
      reason: "still_installed",
      installationId: INSTALLATION_ID,
    });
    expect(mocks.fullDelete).not.toHaveBeenCalled();
  });

  it("throws a not_confirmed error and deletes nothing when reading the install back fails", async () => {
    mocks.getInstallationById.mockRejectedValue(new Error("network down"));

    const error = await _runAndCatch([PROVINCES_DATASET_ID]);

    expect(error).toBeInstanceOf(UninstallPluginError);
    expect(error).toMatchObject({
      reason: "not_confirmed",
      installationId: INSTALLATION_ID,
    });
    expect(mocks.fullDelete).not.toHaveBeenCalled();
  });

  it("goes on after a failed delete and returns it", async () => {
    mocks.fullDelete.mockImplementation(async ({ id }: { id: string }) => {
      if (id === PROVINCES_DATASET_ID) {
        throw new Error("storage down");
      }
    });

    const outcome = await _run([PROVINCES_DATASET_ID, DISTRICTS_DATASET_ID]);

    expect(mocks.fullDelete).toHaveBeenCalledWith({ id: DISTRICTS_DATASET_ID });
    expect(outcome).toEqual({
      deletedDatasetIds: [DISTRICTS_DATASET_ID],
      failedDatasetIds: [PROVINCES_DATASET_ID],
    });
    expect(mocks.loggerError).toHaveBeenCalledTimes(1);
  });

  describe("a dataset the user may not delete", () => {
    beforeEach(() => {
      mocks.fullDelete.mockImplementation(async ({ id }: { id: string }) => {
        if (id === PROVINCES_DATASET_ID) {
          throw _notAllowed(PROVINCES_DATASET_ID);
        }
        mocks.calls.push(`delete ${id}`);
      });
    });

    it("is returned as failed while the others are still deleted", async () => {
      const outcome = await _run([PROVINCES_DATASET_ID, DISTRICTS_DATASET_ID]);

      expect(outcome).toEqual({
        deletedDatasetIds: [DISTRICTS_DATASET_ID],
        failedDatasetIds: [PROVINCES_DATASET_ID],
      });
      expect(mocks.calls).toEqual(["uninstall", `delete ${DISTRICTS_DATASET_ID}`]);
    });

    it("is not logged as an unexpected error", async () => {
      await _run([PROVINCES_DATASET_ID]);

      expect(mocks.loggerError).not.toHaveBeenCalled();
    });

    it("is not read again to see whether it was deleted", async () => {
      await _run([PROVINCES_DATASET_ID]);

      expect(mocks.getDatasetById).toHaveBeenCalledTimes(1);
    });
  });

  it("returns a dataset as failed when its row survives the delete", async () => {
    mocks.fullDelete.mockRejectedValue(
      new DatasetDeleteError({
        datasetId: PROVINCES_DATASET_ID,
        reason: "still_present",
      }),
    );

    const outcome = await _run([PROVINCES_DATASET_ID]);

    expect(outcome).toEqual({
      deletedDatasetIds: [],
      failedDatasetIds: [PROVINCES_DATASET_ID],
    });
  });

  describe("when fullDelete throws after the row was deleted", () => {
    beforeEach(() => {
      mocks.fullDelete.mockRejectedValue(new Error("duckdb cleanup failed"));
    });

    it("counts the dataset as deleted when its row is gone", async () => {
      mocks.getDatasetById
        .mockResolvedValueOnce({ id: PROVINCES_DATASET_ID })
        .mockResolvedValueOnce(undefined);

      const outcome = await _run([PROVINCES_DATASET_ID]);

      expect(outcome).toEqual({
        deletedDatasetIds: [PROVINCES_DATASET_ID],
        failedDatasetIds: [],
      });
    });

    it("still logs the error", async () => {
      mocks.getDatasetById
        .mockResolvedValueOnce({ id: PROVINCES_DATASET_ID })
        .mockResolvedValueOnce(undefined);

      await _run([PROVINCES_DATASET_ID]);

      expect(mocks.loggerError).toHaveBeenCalledTimes(1);
    });

    it("counts the dataset as failed when reading it back throws", async () => {
      mocks.getDatasetById
        .mockResolvedValueOnce({ id: PROVINCES_DATASET_ID })
        .mockRejectedValueOnce(new Error("network down"));

      const outcome = await _run([PROVINCES_DATASET_ID]);

      expect(outcome).toEqual({
        deletedDatasetIds: [],
        failedDatasetIds: [PROVINCES_DATASET_ID],
      });
    });
  });

  describe("a dataset that is already gone", () => {
    beforeEach(() => {
      mocks.getDatasetById.mockImplementation(
        async ({ id }: { id: string }) => {
          return id === PROVINCES_DATASET_ID ? undefined : { id };
        },
      );
    });

    it("is neither deleted nor reported as failed", async () => {
      const outcome = await _run([PROVINCES_DATASET_ID, DISTRICTS_DATASET_ID]);

      expect(outcome).toEqual({
        deletedDatasetIds: [DISTRICTS_DATASET_ID],
        failedDatasetIds: [],
      });
    });

    it("never reaches fullDelete", async () => {
      await _run([PROVINCES_DATASET_ID]);

      expect(mocks.fullDelete).not.toHaveBeenCalled();
    });
  });

  it("deletes a dataset listed twice once, keeping the order of first appearance", async () => {
    const outcome = await _run([
      PROVINCES_DATASET_ID,
      DISTRICTS_DATASET_ID,
      PROVINCES_DATASET_ID,
    ]);

    expect(mocks.calls).toEqual([
      "uninstall",
      `delete ${PROVINCES_DATASET_ID}`,
      `delete ${DISTRICTS_DATASET_ID}`,
    ]);
    expect(outcome.deletedDatasetIds).toEqual([
      PROVINCES_DATASET_ID,
      DISTRICTS_DATASET_ID,
    ]);
  });

  it("returns a dataset as failed without deleting it when reading it first throws", async () => {
    mocks.getDatasetById.mockRejectedValueOnce(new Error("network down"));

    const outcome = await _run([PROVINCES_DATASET_ID]);

    expect(mocks.fullDelete).not.toHaveBeenCalled();
    expect(outcome).toEqual({
      deletedDatasetIds: [],
      failedDatasetIds: [PROVINCES_DATASET_ID],
    });
    expect(mocks.loggerError).toHaveBeenCalledTimes(1);
  });
});
