import { beforeEach, describe, expect, it, vi } from "vitest";
import { DatasetDeleteError } from "@/clients/datasets/DatasetClient/DatasetDeleteError";
import { UninstallPluginError } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/UninstallPluginModal/uninstallPluginAndDeleteDatasets/UninstallPluginError";
import { uninstallPluginAndDeleteDatasets } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/UninstallPluginModal/uninstallPluginAndDeleteDatasets/uninstallPluginAndDeleteDatasets";
import type { UninstallOutcome } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/UninstallPluginModal/uninstallPluginAndDeleteDatasets/uninstallPluginAndDeleteDatasets";
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

function _run(
  datasetIds: readonly Dataset.Id[],
): Promise<UninstallOutcome> {
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
      refusedDatasetIds: [],
      incompleteDatasetIds: [],
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
    const readError = new Error("network down");
    mocks.getInstallationById.mockRejectedValue(readError);

    const error = await _runAndCatch([PROVINCES_DATASET_ID]);

    expect(error).toBeInstanceOf(UninstallPluginError);
    expect(error).toMatchObject({
      reason: "not_confirmed",
      installationId: INSTALLATION_ID,
    });
    expect(mocks.fullDelete).not.toHaveBeenCalled();
  });

  it("keeps the read error as the cause of a not_confirmed error", async () => {
    const readError = new Error("network down");
    mocks.getInstallationById.mockRejectedValue(readError);

    const error = await _runAndCatch([PROVINCES_DATASET_ID]);

    expect(error).toHaveProperty("cause", readError);
  });

  describe("when one delete throws", () => {
    beforeEach(() => {
      mocks.fullDelete.mockImplementation(async ({ id }: { id: string }) => {
        if (id === PROVINCES_DATASET_ID) {
          throw new Error("storage down");
        }
        mocks.calls.push(`delete ${id}`);
      });
    });

    it("still deletes the datasets after it", async () => {
      await _run([PROVINCES_DATASET_ID, DISTRICTS_DATASET_ID]);

      expect(mocks.calls).toEqual(["uninstall", `delete ${DISTRICTS_DATASET_ID}`]);
    });

    it("returns that dataset as incomplete and the others as deleted", async () => {
      const outcome = await _run([PROVINCES_DATASET_ID, DISTRICTS_DATASET_ID]);

      expect(outcome).toEqual({
        deletedDatasetIds: [DISTRICTS_DATASET_ID],
        refusedDatasetIds: [],
        incompleteDatasetIds: [PROVINCES_DATASET_ID],
      });
    });

    it("logs the error once", async () => {
      await _run([PROVINCES_DATASET_ID, DISTRICTS_DATASET_ID]);

      expect(mocks.loggerError).toHaveBeenCalledTimes(1);
    });
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

    it("is returned as refused while the others are still deleted", async () => {
      const outcome = await _run([PROVINCES_DATASET_ID, DISTRICTS_DATASET_ID]);

      expect(outcome).toEqual({
        deletedDatasetIds: [DISTRICTS_DATASET_ID],
        refusedDatasetIds: [PROVINCES_DATASET_ID],
        incompleteDatasetIds: [],
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

  describe("when fullDelete reports that the row is still present", () => {
    beforeEach(() => {
      mocks.fullDelete.mockRejectedValue(
        new DatasetDeleteError({
          datasetId: PROVINCES_DATASET_ID,
          reason: "still_present",
        }),
      );
      // A re-read would find nothing, so only the error's own reason can
      // make the dataset count as incomplete.
      mocks.getDatasetById
        .mockResolvedValueOnce({ id: PROVINCES_DATASET_ID })
        .mockResolvedValue(undefined);
    });

    it("returns the dataset as incomplete, since its files may be gone", async () => {
      const outcome = await _run([PROVINCES_DATASET_ID]);

      expect(outcome).toEqual({
        deletedDatasetIds: [],
        refusedDatasetIds: [],
        incompleteDatasetIds: [PROVINCES_DATASET_ID],
      });
    });

    it("logs the error", async () => {
      await _run([PROVINCES_DATASET_ID]);

      expect(mocks.loggerError).toHaveBeenCalledTimes(1);
    });

    it("does not read the dataset again", async () => {
      await _run([PROVINCES_DATASET_ID]);

      expect(mocks.getDatasetById).toHaveBeenCalledTimes(1);
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
        refusedDatasetIds: [],
        incompleteDatasetIds: [],
      });
    });

    it("still logs the error", async () => {
      mocks.getDatasetById
        .mockResolvedValueOnce({ id: PROVINCES_DATASET_ID })
        .mockResolvedValueOnce(undefined);

      await _run([PROVINCES_DATASET_ID]);

      expect(mocks.loggerError).toHaveBeenCalledTimes(1);
    });

    it("counts the dataset as incomplete when reading it back throws, since it may be gone", async () => {
      mocks.getDatasetById
        .mockResolvedValueOnce({ id: PROVINCES_DATASET_ID })
        .mockRejectedValueOnce(new Error("network down"));

      const outcome = await _run([PROVINCES_DATASET_ID]);

      expect(outcome).toEqual({
        deletedDatasetIds: [],
        refusedDatasetIds: [],
        incompleteDatasetIds: [PROVINCES_DATASET_ID],
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

    it("is left out of every list of the outcome", async () => {
      const outcome = await _run([PROVINCES_DATASET_ID, DISTRICTS_DATASET_ID]);

      expect(outcome).toEqual({
        deletedDatasetIds: [DISTRICTS_DATASET_ID],
        refusedDatasetIds: [],
        incompleteDatasetIds: [],
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

  it("returns a dataset as incomplete without deleting it when reading it first throws", async () => {
    mocks.getDatasetById.mockRejectedValueOnce(new Error("network down"));

    const outcome = await _run([PROVINCES_DATASET_ID]);

    expect(mocks.fullDelete).not.toHaveBeenCalled();
    expect(outcome).toEqual({
      deletedDatasetIds: [],
      refusedDatasetIds: [],
      incompleteDatasetIds: [PROVINCES_DATASET_ID],
    });
    expect(mocks.loggerError).toHaveBeenCalledTimes(1);
  });
});
